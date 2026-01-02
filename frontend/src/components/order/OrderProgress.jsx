import {
  ShoppingBag,
  Utensils,
  CheckCircle,
  Truck,
  MapPin,
} from "lucide-react";

const OrderProgress = ({ currentStatus, statusSteps }) => {
  const currentIndex = statusSteps.indexOf(currentStatus);

  const getIcon = (index) => {
    const icons = [
      <ShoppingBag />,
      <Utensils />,
      <CheckCircle />,
      <Truck />,
      <MapPin />,
    ];
    return icons[index];
  };

  return (
    <div className="bg-gray-950 p-10 rounded-[3rem] border border-gray-900 mb-8 shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative">
        {statusSteps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div
              key={step}
              className="flex flex-col items-center z-10 flex-1 w-full md:w-auto"
            >
              <div
                className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-700 border-2 
                ${
                  isCompleted
                    ? "bg-primary border-primary shadow-[0_0_25px_rgba(239,68,68,0.4)] text-white"
                    : "bg-gray-900 border-gray-800 text-gray-700"
                }
                ${isCurrent ? "animate-pulse scale-110" : ""}`}
              >
                {getIcon(index)}
              </div>
              <p
                className={`mt-4 font-black uppercase tracking-tighter text-sm italic ${
                  isCompleted ? "text-white" : "text-gray-700"
                }`}
              >
                {step}
              </p>
              {isCurrent && (
                <span className="mt-1 text-[9px] font-black text-primary animate-bounce uppercase tracking-widest">
                  Live Tracking...
                </span>
              )}
            </div>
          );
        })}
        {/* Progress Line */}
        <div className="hidden md:block absolute top-8 left-0 right-0 h-[2px] bg-gray-900 -z-0 rounded-full mx-10 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{
              width: `${(currentIndex / (statusSteps.length - 1)) * 100}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default OrderProgress;
