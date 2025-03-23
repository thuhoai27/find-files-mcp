#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import mime from 'mime-types'; // Add dependency: npm install mime-types

const server = new McpServer({
    name: "FindFiles",
    version: "1.1.0"
});

// Helper function to format file size
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Wildcard to regex conversion
function wildcardToRegex(pattern) {
    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`);
}

// Main file search function with advanced features
async function findFiles({
    startDirs, // Changed from startDir to startDirs (array)
    filename,
    extension,
    minSize,
    maxSize,
    createdAfter,
    createdBefore,
    modifiedAfter,
    modifiedBefore,
    recursive,
    caseSensitive,
    contentSearch,
    fileType,
    maxResults = 1000,
    timeoutMs = 30000
}) {
    const results = [];
    const queue = [...startDirs]; // Initialize queue with all start directories
    const filenameRegex = filename ? wildcardToRegex(filename) : null;
    const startTime = Date.now();

    while (queue.length > 0 && results.length < maxResults) {
        if (Date.now() - startTime > timeoutMs) {
            throw new Error("Search timed out");
        }

        const currentDir = queue.shift();
        let files;

        try {
            files = await fs.promises.readdir(currentDir, { withFileTypes: true });
        } catch (err) {
            continue; // Skip inaccessible directories
        }

        for (const dirent of files) {
            const filePath = path.join(currentDir, dirent.name);
            let stats;

            try {
                stats = await fs.promises.stat(filePath);
            } catch (err) {
                continue; // Skip inaccessible files
            }

            if (stats.isDirectory() && recursive) {
                queue.push(filePath);
            }

            if (stats.isFile()) {
                const fileName = dirent.name;
                const mimeType = mime.lookup(filePath) || 'application/octet-stream';

                // Filename matching with case sensitivity
                if (filenameRegex) {
                    const testName = caseSensitive ? fileName : fileName.toLowerCase();
                    const testPattern = caseSensitive ? filename : filename.toLowerCase();
                    if (!filenameRegex.test(testName) && !testName.includes(testPattern)) continue;
                }

                // Extension filter
                if (extension && !fileName.endsWith(`.${extension}`)) continue;

                // File size filters
                if (minSize && stats.size < minSize) continue;
                if (maxSize && stats.size > maxSize) continue;

                // Date filters
                if (createdAfter && stats.birthtime < createdAfter) continue;
                if (createdBefore && stats.birthtime > createdBefore) continue;
                if (modifiedAfter && stats.mtime < modifiedAfter) continue;
                if (modifiedBefore && stats.mtime > modifiedBefore) continue;

                // File type filter
                if (fileType && !mimeType.startsWith(fileType)) continue;

                // Content search for text files
                let contentMatch = true;
                if (contentSearch && mimeType.startsWith('text/')) {
                    try {
                        const content = await fs.promises.readFile(filePath, 'utf8');
                        contentMatch = content.includes(contentSearch);
                    } catch (err) {
                        contentMatch = false;
                    }
                }
                if (contentSearch && !contentMatch) continue;

                results.push({
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime.toISOString(),
                    modified: stats.mtime.toISOString(),
                    type: mimeType
                });
            }
        }
    }

    return results;
}

// Advanced Find Files Tool
server.tool(
    "advanced_find_files",
    "An advanced tool to search for files on the user's computer with enhanced filtering options including wildcard patterns, content search, and file type filtering.",
    {
        directories: z.array(z.string()).optional().describe("The directory paths to start the search from. Multiple directories can be specified."),
        filename: z.string().optional().describe("The name or wildcard pattern of the file to search for (e.g., *.txt, file*, *test*)."),
        extension: z.string().optional().describe("The file extension to search for (e.g., pdf, txt, jpg)."),
        minSize: z.number().optional().describe("Minimum file size (in bytes)."),
        maxSize: z.number().optional().describe("Maximum file size (in bytes)."),
        createdAfter: z.string().optional().describe("Search for files created after this date (YYYY-MM-DD format)."),
        createdBefore: z.string().optional().describe("Search for files created before this date (YYYY-MM-DD format)."),
        modifiedAfter: z.string().optional().describe("Search for files modified after this date (YYYY-MM-DD format)."),
        modifiedBefore: z.string().optional().describe("Search for files modified before this date (YYYY-MM-DD format)."),
        recursive: z.boolean().optional().default(true).describe("Whether to search subdirectories recursively."),
        caseSensitive: z.boolean().optional().default(false).describe("Whether filename matching should be case-sensitive."),
        contentSearch: z.string().optional().describe("Search for this text within file contents (text files only)."),
        fileType: z.enum(['text', 'image', 'audio', 'video', 'application']).optional().describe("Filter by file type (e.g., text, image, audio)."),
        maxResults: z.number().optional().default(1000).describe("Maximum number of results to return."),
        timeoutMs: z.number().optional().default(30000).describe("Maximum search time in milliseconds before timeout.")
    },
    async ({
        directories,
        filename,
        extension,
        minSize,
        maxSize,
        createdAfter,
        createdBefore,
        modifiedAfter,
        modifiedBefore,
        recursive,
        caseSensitive,
        contentSearch,
        fileType,
        maxResults,
        timeoutMs
    }) => {
        try {
            // Get directories from command line arguments if not provided in tool call
            const startDirs = directories && directories.length > 0
                ? directories
                : process.argv.slice(2);

            if (!startDirs || startDirs.length === 0) {
                return { content: [{ type: "text", text: "Please specify at least one directory to search." }] };
            }

            const results = await findFiles({
                startDirs,
                filename,
                extension,
                minSize,
                maxSize,
                createdAfter: createdAfter ? new Date(createdAfter) : undefined,
                createdBefore: createdBefore ? new Date(createdBefore) : undefined,
                modifiedAfter: modifiedAfter ? new Date(modifiedAfter) : undefined,
                modifiedBefore: modifiedBefore ? new Date(modifiedBefore) : undefined,
                recursive,
                caseSensitive,
                contentSearch,
                fileType,
                maxResults,
                timeoutMs
            });

            if (results.length === 0) {
                return { content: [{ type: "text", text: "No files found matching the search criteria." }] };
            }

            const resultText = results.map(file =>
                `Path: ${file.path}\nSize: ${formatFileSize(file.size)}\nCreated: ${file.created}\nModified: ${file.modified}\nType: ${file.type}\n`
            ).join("\n");

            return { content: [{ type: "text", text: `${results.length} files found:\n\n${resultText}` }] };
        } catch (error) {
            return { content: [{ type: "text", text: `An error occurred during file search: ${error.message}` }] };
        }
    }
);

// Connect to server
const transport = new StdioServerTransport();
server.connect(transport);