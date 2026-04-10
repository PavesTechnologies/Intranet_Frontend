import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, Frown, Smile, Meh, Heart, Info } from 'lucide-react';

export default function FeedbackSurveyTab({ exit_uuid, employee_uuid }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    overallExperience: null,
    managementRating: 5,
    growthRating: 5,
    cultureRating: 5,
    likesMost: '',
    improveSuggestion: '',
    recommend: null
  });

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  // Pre-submitted view for HR (Mock)
  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-green-50/50 rounded-3xl border border-green-100">
        <div className="bg-white p-5 rounded-full mb-6 shadow-sm border border-green-200">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Survey Completed</h3>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">The employee has successfully submitted the final feedback survey. Their responses have been recorded in their offboarding profile.</p>
        <button 
          onClick={() => setIsSubmitted(false)}
          className="mt-8 bg-white border border-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          View Form Responses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-gray-900">Employee Feedback Survey</h2>
        <p className="text-gray-500 mt-2">Help us understand your journey to improve the experience for future talent.</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-10 relative">
        <div className="absolute top-1/2 left-0 w-full h-1.5 bg-gray-100 -translate-y-1/2 rounded-full"></div>
        <div 
          className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        ></div>
        
        <div className="relative flex justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div 
              key={step} 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                step < currentStep ? 'bg-indigo-600 text-white shadow-md' :
                step === currentStep ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 border-4 border-white' :
                'bg-white text-gray-400 border-2 border-gray-200'
              }`}
            >
              {step < currentStep ? <CheckCircle2 size={18} /> : step}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 md:p-12 min-h-[400px] flex flex-col transition-all duration-300">
        
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">How was your overall experience working with us?</h3>
            <div className="flex justify-center gap-6 md:gap-10 mt-12">
              {[
                { id: 'terrible', icon: Frown, label: 'Terrible', color: 'text-red-500', bg: 'bg-red-50', hover: 'hover:bg-red-50 hover:border-red-200' },
                { id: 'okay', icon: Meh, label: 'Okay', color: 'text-amber-500', bg: 'bg-amber-50', hover: 'hover:bg-amber-50 hover:border-amber-200' },
                { id: 'good', icon: Smile, label: 'Good', color: 'text-green-500', bg: 'bg-green-50', hover: 'hover:bg-green-50 hover:border-green-200' },
                { id: 'excellent', icon: Heart, label: 'Excellent', color: 'text-rose-500', bg: 'bg-rose-50', hover: 'hover:bg-rose-50 hover:border-rose-200' }
              ].map(mood => {
                const Icon = mood.icon;
                const isSelected = formData.overallExperience === mood.id;
                return (
                  <button 
                    key={mood.id}
                    onClick={() => setFormData({...formData, overallExperience: mood.id})}
                    className={`flex flex-col items-center gap-4 transition-all duration-300 transform ${isSelected ? 'scale-110' : 'scale-100 opacity-60 hover:opacity-100'}`}
                  >
                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 ${
                      isSelected ? `${mood.bg} ${mood.color} border-${mood.color.split('-')[1]}-200 shadow-lg` : `bg-white border-gray-100 text-gray-400 ${mood.hover}`
                    }`}>
                      <Icon size={40} />
                    </div>
                    <span className={`font-semibold ${isSelected ? mood.color : 'text-gray-500'}`}>{mood.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Rate specific elements of your journey</h3>
            
            <div className="space-y-8">
              {[
                { id: 'managementRating', label: 'Management Support & Guidance' },
                { id: 'growthRating', label: 'Career Growth Opportunities' },
                { id: 'cultureRating', label: 'Team Culture & Inclusion' },
              ].map(slider => (
                <div key={slider.id}>
                  <div className="flex justify-between items-end mb-3">
                    <label className="font-semibold text-gray-700">{slider.label}</label>
                    <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg text-sm">{formData[slider.id]} / 10</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="10" 
                    value={formData[slider.id]}
                    onChange={(e) => setFormData({...formData, [slider.id]: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Open Feedback</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block font-semibold text-gray-700 mb-2">What did you enjoy most about your time here?</label>
                <textarea 
                  value={formData.likesMost}
                  onChange={(e) => setFormData({...formData, likesMost: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 resize-none h-32 bg-gray-50/50 hover:bg-white transition-colors"
                  placeholder="Tell us what we did right..."
                ></textarea>
              </div>
              
              <div>
                <label className="block font-semibold text-gray-700 mb-2">What could the organization do better?</label>
                <textarea 
                  value={formData.improveSuggestion}
                  onChange={(e) => setFormData({...formData, improveSuggestion: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 resize-none h-32 bg-gray-50/50 hover:bg-white transition-colors"
                  placeholder="Be honest, all feedback is completely anonymous and valuable to us..."
                ></textarea>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col justify-center items-center text-center">
            <div className="bg-indigo-50 text-indigo-500 p-4 rounded-full mb-6">
              <Info size={32} />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6">Would you recommend us?</h3>
            <p className="text-gray-500 max-w-sm mb-10">Would you recommend our company to a friend or colleague as a great place to work?</p>
            
            <div className="flex gap-4 w-full justify-center">
              <button 
                onClick={() => setFormData({...formData, recommend: true})}
                className={`flex-1 max-w-[160px] py-4 rounded-2xl border-2 font-bold transition-all text-lg ${
                  formData.recommend === true 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' 
                    : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-300'
                }`}
              >
                Yes, absolutely
              </button>
              <button 
                onClick={() => setFormData({...formData, recommend: false})}
                className={`flex-1 max-w-[160px] py-4 rounded-2xl border-2 font-bold transition-all text-lg ${
                  formData.recommend === false 
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-md' 
                    : 'border-gray-200 bg-white text-gray-500 hover:border-red-200'
                }`}
              >
                No, I wouldn't
              </button>
            </div>
          </div>
        )}

        {/* Wizard Navigation */}
        <div className="flex justify-between mt-auto pt-10">
          <button 
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              currentStep === 1 
                ? 'text-gray-300 cursor-not-allowed hidden' 
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft size={18} /> Previous
          </button>
          
          <button 
            onClick={currentStep === totalSteps ? handleSubmit : handleNext}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all ml-auto ${
              currentStep === totalSteps 
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {currentStep === totalSteps ? 'Submit Feedback' : 'Next Step'} 
            {currentStep !== totalSteps && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
