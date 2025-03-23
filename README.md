# FindFiles

An advanced file search tool that allows users to search for files on their computer using various filtering options.

## Key Features

- **Multi-directory Search**: Search simultaneously from multiple starting directories
- **Wildcard Patterns**: Search for filenames using patterns like `*.txt`, `file*`, `*test*`
- **File Attribute Filtering**: Filter by size, creation date, and modification date
- **Content Search**: Support for searching within text file contents
- **File Type Filtering**: Filter by file types such as text, image, audio, video, application
- **Case Sensitivity Option**: Configure whether filename matching is case-sensitive
- **Recursive Search**: Option to search subdirectories
- **Search Limitations**: Set maximum number of results and time limits

## Usage

This tool is implemented as an MCP (Model Context Protocol) server and supports the following parameters:

- `directories`: Array of directory paths to start the search from
- `filename`: File name or wildcard pattern to search for
- `extension`: File extension to search for
- `minSize`: Minimum file size (in bytes)
- `maxSize`: Maximum file size (in bytes)
- `createdAfter`: Search for files created after this date (YYYY-MM-DD format)
- `createdBefore`: Search for files created before this date (YYYY-MM-DD format)
- `modifiedAfter`: Search for files modified after this date (YYYY-MM-DD format)
- `modifiedBefore`: Search for files modified before this date (YYYY-MM-DD format)
- `recursive`: Whether to search subdirectories recursively (default: true)
- `caseSensitive`: Whether filename matching should be case-sensitive (default: false)
- `contentSearch`: Text to search for within file contents (text files only)
- `fileType`: Filter by file type (text, image, audio, video, application)
- `maxResults`: Maximum number of results to return (default: 1000)
- `timeoutMs`: Maximum search time in milliseconds before timeout (default: 30000)

## Installation
```json
{
    "mcpServers": {
        "find-files": {
            "command": "npx",
            "args": [
                "-y",
                "find-files-mcp",
                "/Users/kst/Downloads",
                "/Users/kst/Desktop",
                "/Users/kst/Documents"
            ]
        }
    }
}
```