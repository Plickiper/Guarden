import React, { useState, useEffect } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { auth } from '../../config/firebase';

interface ReportData {
  type: 'environmental' | 'regulatory';
  category?: string;
  city?: string;
  violationType?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  description: string;
  imageUrl?: string;
  status: 'pending' | 'in-progress' | 'resolved';
  timestamp: number;
  userId: string;
}

const ReportForm: React.FC = () => {
  const [reportType, setReportType] = useState<'environmental' | 'regulatory'>('environmental');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [violationType, setViolationType] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!location) {
      setError('Please allow location access to submit a report');
      setLoading(false);
      return;
    }

    try {
      const reportData: ReportData = {
        type: reportType,
        location,
        description,
        status: 'pending',
        timestamp: Date.now(),
        userId: auth.currentUser?.uid || '',
      };

      if (reportType === 'environmental') {
        reportData.category = category;
      } else {
        reportData.city = city;
        reportData.violationType = violationType;
      }

      // TODO: Implement image upload to Firebase Storage
      // For now, we'll just store the report without the image
      const reportsRef = ref(database, 'reports');
      const newReportRef = push(reportsRef);
      await set(newReportRef, reportData);

      setSuccess(true);
      // Reset form
      setCategory('');
      setCity('');
      setViolationType('');
      setDescription('');
      setImageFile(null);
      setImagePreview('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Submit a Report
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Report environmental violations or city regulation compliance issues in your community.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">Report submitted successfully!</div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setReportType('environmental')}
                className={`flex-1 py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  reportType === 'environmental'
                    ? 'bg-primary-600 text-white border-transparent'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Environmental Violation
              </button>
              <button
                type="button"
                onClick={() => setReportType('regulatory')}
                className={`flex-1 py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  reportType === 'regulatory'
                    ? 'bg-primary-600 text-white border-transparent'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                City Regulation Compliance
              </button>
            </div>

            {reportType === 'environmental' ? (
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Violation Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a category</option>
                  <option value="waste">Improper Waste Management</option>
                  <option value="dumping">Illegal Dumping</option>
                  <option value="water">Water Pollution</option>
                  <option value="air">Air Pollution</option>
                  <option value="deforestation">Deforestation</option>
                  <option value="other">Other Environmental Violation</option>
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <select
                    id="city"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a city</option>
                    <option value="Makati">Makati</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="violation-type" className="block text-sm font-medium text-gray-700">
                    Violation Type
                  </label>
                  <select
                    id="violation-type"
                    name="violation-type"
                    value={violationType}
                    onChange={(e) => setViolationType(e.target.value)}
                    required
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select violation type</option>
                    <option value="single_use_plastic">Single-Use Plastics</option>
                    <option value="styrofoam">Styrofoam Containers</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Provide detailed information about the violation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Photo Evidence</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <div className="mb-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="mx-auto h-32 w-auto object-cover"
                      />
                    </div>
                  ) : (
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {loading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportForm; 