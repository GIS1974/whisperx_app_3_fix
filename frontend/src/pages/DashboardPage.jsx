import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mediaAPI, transcriptionAPI } from '../services/api';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatFileSize, formatDuration, formatDate } from '../utils/formatters';

export const DashboardPage = () => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMediaFiles();
  }, [filter]);

  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      
      const response = await mediaAPI.getMediaFiles(params);
      setMediaFiles(response.results || response);
    } catch (error) {
      toast.error('Failed to fetch media files');
      console.error('Error fetching media files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await mediaAPI.deleteMediaFile(fileId);
      setMediaFiles(mediaFiles.filter(file => file.id !== fileId));
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error('Failed to delete file');
      console.error('Error deleting file:', error);
    }
  };

  // Format current date/time as YYYY-MM-DDTHHMMSS (local time)
  const formatTimestamp = (date = new Date()) => {
    const pad = (n) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const HH = pad(date.getHours());
    const MM = pad(date.getMinutes());
    const SS = pad(date.getSeconds());
    return `${yyyy}-${mm}-${dd}T${HH}${MM}${SS}`;
  };

  // Remove the extension from a filename
  const getBaseName = (filename = '') => {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(0, lastDot) : filename;
  };

  const handleDownload = async (file, fileType) => {
    try {
      const response = await transcriptionAPI.downloadSubtitleFile(file.id, fileType);

      // Create blob and download
      const blob = new Blob([response], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Build filename: "<media base name> YYYY-MM-DDTHHMMSS.<ext>"
      const baseName = getBaseName(file.filename_original);
      const timestamp = formatTimestamp(new Date());
      const safeBase = baseName.replace(/[\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
      link.download = `${safeBase} ${timestamp}.${fileType.toLowerCase()}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${fileType} file downloaded successfully`);
    } catch (error) {
      toast.error(`Failed to download ${fileType} file`);
      console.error('Error downloading file:', error);
    }
  };

  const getStatusCounts = () => {
    const counts = {
      all: mediaFiles.length,
      completed: 0,
      processing: 0,
      failed: 0,
    };

    mediaFiles.forEach(file => {
      if (file.is_completed) {
        counts.completed++;
      } else if (file.is_processing) {
        counts.processing++;
      } else if (file.has_failed) {
        counts.failed++;
      }
    });

    return counts;
  };

  const getStatusBadge = (file) => {
    const status = file.status || 'unknown';
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      processing: { color: 'bg-yellow-100 text-yellow-800', text: 'Processing' },
      transcribing: { color: 'bg-blue-100 text-blue-800', text: 'Transcribing' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' },
      failed_audio_extraction: { color: 'bg-red-100 text-red-800', text: 'Audio Failed' },
      failed_transcription: { color: 'bg-red-100 text-red-800', text: 'Transcription Failed' },
      failed_audio_too_large: { color: 'bg-red-100 text-red-800', text: 'File Too Large' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'video': return '🎥';
      case 'audio': return '🎵';
      default: return '📄';
    }
  };

  const canOpen = (file) => {
    return file.is_completed;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your uploaded media files and transcriptions
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          Upload New File
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📁</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.completed}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">⏳</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.processing}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">✗</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Files', count: statusCounts.all },
            { key: 'completed', label: 'Completed', count: statusCounts.completed },
            { key: 'processing', label: 'Processing', count: statusCounts.processing },
            { key: 'failed', label: 'Failed', count: statusCounts.failed },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Media Files Table */}
      {mediaFiles.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">📁</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all'
              ? "You haven't uploaded any files yet."
              : `No files with status "${filter}" found.`}
          </p>
          <Link to="/upload" className="btn-primary">
            Upload Your First File
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mediaFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50 transition-colors duration-150">
                    {/* File Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">
                          {getFileIcon(file.file_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {file.filename_original}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(file.filesize_bytes)} • {file.file_type} • {file.language_transcription.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {file.duration_seconds ? formatDuration(file.duration_seconds) : '-'}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(file.upload_date)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(file)}
                    </td>

                    {/* Downloads */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canOpen(file) ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDownload(file, 'vtt')}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                            title="Download VTT"
                          >
                            VTT
                          </button>
                          <button
                            onClick={() => handleDownload(file, 'srt')}
                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                            title="Download SRT"
                          >
                            SRT
                          </button>
                          <button
                            onClick={() => handleDownload(file, 'txt')}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                            title="Download TXT"
                          >
                            TXT
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not available</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        {canOpen(file) ? (
                          <Link
                            to={`/player/${file.id}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            Open
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                          >
                            {file.is_processing ? 'Processing...' : 'Not Ready'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
