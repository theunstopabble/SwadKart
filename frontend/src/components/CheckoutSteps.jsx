import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const CheckoutSteps = ({ step1, step2, step3, step4 }) => {
  const steps = [
    { name: "Sign In", active: step1, link: "/login" },
    { name: "Shipping", active: step2, link: "/shipping" },
    { name: "Payment", active: step3, link: "/payment" },
    { name: "Place Order", active: step4, link: "/placeorder" },
  ];

  return (
    <div className="flex justify-center items-center mb-8 w-full max-w-3xl mx-auto">
      {steps.map((step) => (
        <div key={step.name} className="flex items-center w-full">
          {/* Step Circle & Link */}
          <div className="relative flex flex-col items-center">
            {step.active ? (
              <Link
                to={step.link}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-primary text-white font-bold transition-all shadow-lg shadow-primary/30"
              >
                {index + 1 < steps.filter((s) => s.active).length ? (
                  <Check size={18} />
                ) : (
                  index + 1
                )}
              </Link>
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-gray-800 text-gray-500 font-bold border border-gray-700">
                {index + 1}
              </div>
            )}

            {/* Step Name */}
            <span
              className={`absolute -bottom-6 text-[10px] md:text-xs font-bold uppercase tracking-wide w-24 text-center ${
                step.active ? "text-white" : "text-gray-600"
              }`}
            >
              {step.name}
            </span>
          </div>

          {/* Connector Line (Last step ke baad nahi dikhana) */}
          {index !== steps.length - 1 && (
            <div
              className={`flex-grow h-1 mx-2 rounded-full ${
                step.active && steps[index + 1]?.active
                  ? "bg-primary"
                  : "bg-gray-800"
              }`}
            ></div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CheckoutSteps;
