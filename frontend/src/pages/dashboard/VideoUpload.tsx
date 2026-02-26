import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setError('');

    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('対応していないファイル形式です。mp4, mov, avi, wmv のみアップロード可能です');
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError('ファイルサイズが100MBを超えています');
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('video', file);

    try {
      await api.post('/videos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setProgress(percent);
        },
      });
      navigate('/dashboard/videos');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">動画アップロード</h1>

      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
        {/* ファイル選択エリア */}
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-400"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-ms-wmv"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-500">クリックして動画を選択</p>
              <p className="mt-1 text-sm text-gray-400">
                mp4, mov, avi, wmv / 最大100MB / 1分以内
              </p>
            </div>
          )}
        </div>

        {/* プログレスバー */}
        {uploading && (
          <div className="rounded bg-gray-200">
            <div
              className="rounded bg-blue-600 py-1 text-center text-xs text-white"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading}
          className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'アップロード中...' : 'アップロード'}
        </button>
      </form>
    </div>
  );
}
