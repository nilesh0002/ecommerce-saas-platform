import React from 'react';

const HardwareSpecsTable = ({ specifications = [] }) => {
  if (!specifications.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b">
        <h3 className="text-lg font-semibold">Technical Specifications</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {specifications.map((spec, index) => (
          <div key={index} className="px-6 py-4 flex">
            <div className="w-1/3 font-medium text-gray-900">{spec.spec_name}</div>
            <div className="w-2/3 text-gray-700">{spec.spec_value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HardwareSpecsTable;