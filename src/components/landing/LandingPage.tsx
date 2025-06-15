import React from 'react';
import { Link } from 'react-router-dom';
import cleaningBackground from '../../assets/images/backgrounds/cleaning-background.jpg';
import secureImage from '../../assets/images/features/secure.jpg';
import communityImage from '../../assets/images/features/community.jpg';
import easyImage from '../../assets/images/features/easy.jpg';
import '../../styles/landing.css';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div 
        className="min-h-screen landing-background flex items-center justify-center"
        style={{ backgroundImage: `url(${cleaningBackground})` }}
      >
        <div className="container mx-auto px-4 py-16 landing-content text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <i className='bx bxs-shield text-5xl text-green-600'></i>
            <h1 className="text-6xl font-bold text-gray-900 animate-scale-in title-poppins">
              Guarden
            </h1>
          </div>
          <p className="text-2xl text-gray-600 animate-fade-in-delay mb-8">
            Your trusted platform for community safety
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
          >
            Get Started
            <svg
              className="ml-2 -mr-1 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Why Choose Guarden?
          </h2>
          
          {/* Feature 1 */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="text-6xl mb-4">🛡️</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Secure Reporting</h3>
                <p className="text-lg text-gray-600">
                  Report issues safely and anonymously. Your privacy is our top priority.
                </p>
              </div>
              <div className="flex-1">
                <img 
                  src={secureImage} 
                  alt="Secure Reporting" 
                  className="w-full h-64 object-cover rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="flex flex-col md:flex-row-reverse items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="text-6xl mb-4">🌱</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Community Driven</h3>
                <p className="text-lg text-gray-600">
                  Join a community of responsible citizens working together for a safer environment.
                </p>
              </div>
              <div className="flex-1">
                <img 
                  src={communityImage} 
                  alt="Community Driven" 
                  className="w-full h-64 object-cover rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Easy to Use</h3>
                <p className="text-lg text-gray-600">
                  Simple and intuitive reporting process. Get started in minutes.
                </p>
              </div>
              <div className="flex-1">
                <img 
                  src={easyImage} 
                  alt="Easy to Use" 
                  className="w-full h-64 object-cover rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join our community today and help create a safer environment for everyone.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
          >
            Get Started Now
            <svg
              className="ml-2 -mr-1 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 