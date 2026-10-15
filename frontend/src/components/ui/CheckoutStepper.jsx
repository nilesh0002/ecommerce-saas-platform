import React from 'react';

const CheckoutStepper = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'Shipping Address' },
    { number: 2, title: 'Payment Method' },
    { number: 3, title: 'Review Order' }
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            currentStep >= step.number 
              ? 'bg-blue-500 border-blue-500 text-white' 
              : 'border-gray-300 text-gray-300'
          }`}>
            {currentStep > step.number ? '✓' : step.number}
          </div>
          
          <div className="ml-2 mr-4">
            <div className={`text-sm font-medium ${
              currentStep >= step.number ? 'text-blue-600' : 'text-gray-400'
            }`}>
              {step.title}
            </div>
          </div>
          
          {index < steps.length - 1 && (
            <div className={`w-16 h-0.5 mr-4 ${
              currentStep > step.number ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default CheckoutStepper;