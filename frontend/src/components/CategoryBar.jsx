import React from "react";

const categories = [
  { name: "All", icon: "🍱" },
  { name: "Pizza", icon: "🍕" },
  { name: "Burgers", icon: "🍔" },
  { name: "Starters", icon: "🍟" },
  { name: "Main Course", icon: "🍛" },
  { name: "Desserts", icon: "🍰" },
  { name: "Drinks", icon: "🥤" },
];

const CategoryBar = ({ activeCategory, setActiveCategory }) => {
  return (
    <div className="flex overflow-x-auto gap-4 py-6 no-scrollbar">
      {categories.map((cat) => (
        <button
          key={cat.name}
          onClick={() => setActiveCategory(cat.name)}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap transition-all border ${
            activeCategory === cat.name
              ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
              : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600"
          }`}
        >
          <span className="text-xl">{cat.icon}</span>
          <span className="text-xs font-black uppercase tracking-widest">
            {cat.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CategoryBar;
