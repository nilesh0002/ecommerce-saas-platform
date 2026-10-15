import React from 'react';

const RatingStars = ({ rating = 0, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <span key={i} className="text-yellow-400">★</span>
    );
  }

  // Half star
  if (hasHalfStar) {
    stars.push(
      <span key="half" className="text-yellow-400">☆</span>
    );
  }

  // Empty stars
  const remainingStars = 5 - Math.ceil(rating);
  for (let i = 0; i < remainingStars; i++) {
    stars.push(
      <span key={`empty-${i}`} className="text-gray-300">☆</span>
    );
  }

  return (
    <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
      {stars}
      {rating > 0 && (
        <span className="ml-1 text-gray-600">({rating.toFixed(1)})</span>
      )}
    </div>
  );
};

export default RatingStars;