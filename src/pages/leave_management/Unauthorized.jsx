import React from 'react';
import { Lock, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from "../../components/Button/Button";


const Unauthorized = () => {
  const navigate = useNavigate();
  const handleGoToDashboard = () => {
    // window.location.href = '/dashboard';
  
  navigate('/dashboard');
  };

  const handleGoBack = () => {
    // window.history.back();
    navigate(-1);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 overflow-hidden">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 text-center transform hover:scale-105 transition-transform duration-300">
          {/* Error Code */}
          <div className="mb-4">
            <h1 className="text-6xl md:text-7xl font-bold text-gray-800 mb-1">401</h1>
            <p className="text-lg text-gray-600 font-medium">Authorization Required</p>
          </div>

          {/* Lock Icon with Animation */}
          <div className="mb-6 relative">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full mb-3 animate-pulse">
              <Lock className="w-10 h-10 text-purple-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Sorry, you don't have permission to access this page. 
              Please contact your administrator if you believe this is an error.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleGoToDashboard}
              variant="primary"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-3"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>

            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-white text-xs opacity-90">
            Need help? Contact support at{' '}
            <a href="mailto:pavestechnologies1@gmail.com" className="underline hover:no-underline">
              support@pavestechnologies.com
            </a>
          </p>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-white opacity-10 rounded-full"></div>
        <div className="absolute -bottom-4 -right-4 w-96 h-96 bg-white opacity-10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white opacity-5 rounded-full"></div>
      </div>
    </div>
  );
};

export default Unauthorized;