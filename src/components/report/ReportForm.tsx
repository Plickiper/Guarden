import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import LocationMap from '../map/LocationMap';
import { findAppropriateAgency, generateEmailContent, sendEmail } from '../../services/emailService';

interface ReportData {
  type: 'environmental' | 'regulatory';
  category?: string;
  city?: string;
  violationType?: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  image_url?: string;
  status: 'pending' | 'in-progress' | 'done';
  user_id: string;
  timestamp: number;
  address?: string;
  barangay?: string;
  landmark?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

const ReportForm: React.FC = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<'environmental' | 'regulatory'>('environmental');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [violationType, setViolationType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, []);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    
    try {
      // Use OpenStreetMap Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.address) {
        const address = data.address;
        const city = address.city || address.municipality || address.state_district || '';
        const barangay = address.suburb || address.neighbourhood || '';
        const landmark = address.amenity || address.road || '';
        
        setCity(city);
        setLocation(`${landmark}, ${barangay}, ${city}`);
      }
    } catch (error) {
      console.error('Error getting location details:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError('File size must be less than 5MB');
        return;
      }
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        setError('Only PNG and JPEG images are allowed');
        return;
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError('File size must be less than 5MB');
        return;
      }
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        setError('Only PNG and JPEG images are allowed');
        return;
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Upload image if exists
      let imageUrl = '';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('report-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('report-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Insert report into database
      const { error: insertError } = await supabase
        .from('reports')
        .insert([
          {
            report_type: reportType,
            category: reportType === 'environmental' ? category : undefined,
            city: city,
            violation_type: reportType === 'regulatory' ? violationType : undefined,
            description,
            location,
            image_url: imageUrl,
            status: 'pending',
            timestamp: Date.now(),
            user_id: user?.id,
            latitude: latitude,
            longitude: longitude,
            address: location,
            barangay: location.split(',')[1]?.trim(),
            landmark: location.split(',')[0]?.trim()
          }
        ]);

      if (insertError) throw insertError;

      // Reset form
      setReportType('environmental');
      setCategory('');
      setCity('');
      setViolationType('');
      setDescription('');
      setLocation('');
      setImageFile(null);
      setImagePreview(null);
      setLatitude(null);
      setLongitude(null);
      setSuccess(true);
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

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">Report submitted successfully!</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
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
                  <label htmlFor="violationType" className="block text-sm font-medium text-gray-700">
                    Violation Type
                  </label>
                  <select
                    id="violationType"
                    name="violationType"
                    value={violationType}
                    onChange={(e) => setViolationType(e.target.value)}
                    required
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a violation type</option>
                    <option value="noise">Noise Violation</option>
                    <option value="parking">Illegal Parking</option>
                    <option value="construction">Construction Violation</option>
                    <option value="business">Business Permit Violation</option>
                    <option value="other">Other City Regulation Violation</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <div className="mt-2 space-y-4">
                <p className="text-sm text-gray-500">
                  Click on the map to select the location of the violation
                </p>
                <div className="mt-2">
                  <LocationMap onLocationSelect={handleLocationSelect} />
                </div>

                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Selected location coordinates"
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Photo Evidence (Optional)</label>
              <div
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                  isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <div>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="mx-auto h-32 w-auto object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
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
                            className="sr-only"
                            accept="image/png,image/jpeg"
                            onChange={handleImageChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPEG up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
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