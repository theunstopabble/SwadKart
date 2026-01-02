import { Star, StarHalf } from "lucide-react";

const Rating = ({ value, text, color = "#facc15" }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => (
        <span key={index}>
          {value >= index ? (
            <Star size={14} fill={color} stroke={color} />
          ) : value >= index - 0.5 ? (
            <StarHalf size={14} fill={color} stroke={color} />
          ) : (
            <Star size={14} stroke="#4b5563" /> // gray-600
          )}
        </span>
      ))}
      {text && (
        <span className="text-[10px] ml-1 text-gray-500 font-bold uppercase">
          {text}
        </span>
      )}
    </div>
  );
};

export default Rating;
