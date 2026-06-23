import React, { useState, useEffect } from "react";
import { Calculator, TrendingUp, IndianRupee, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";

const CostCalculator = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [analysis, setAnalysis] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingIngredients, setEditingIngredients] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMenuAnalysis();
  }, []);

  const fetchMenuAnalysis = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/cost-calculator/menu`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cost analysis");
      const data = await res.json();
      setAnalysis(data.analysis || []);
      setSummary(data.summary);
    } catch {
      toast.error("Failed to load cost analysis");
    } finally {
      setLoading(false);
    }
  };

  const fetchItemCost = async (productId) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/cost-calculator/item/${productId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch item cost");
      const data = await res.json();
      setSelectedProduct(data);
      setEditingIngredients(data.ingredients || []);
    } catch (_err) {
      toast.error("Failed to load item cost");
    } finally {
      setLoading(false);
    }
  };

  const updateItemCost = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/cost-calculator/item/${selectedProduct.productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ingredients: editingIngredients,
          foodCostPercentage: selectedProduct.foodCostPercentage,
          preparationCost: selectedProduct.preparationCost,
          packagingCost: selectedProduct.packagingCost,
          marginTarget: selectedProduct.marginTarget,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Cost data updated");
      setEditMode(false);
      fetchMenuAnalysis();
    } catch (_err) { toast.error("Failed to update item cost"); void _err; } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setEditingIngredients([...editingIngredients, { name: "", quantity: 1, unit: "g", unitCost: 0 }]);
    setEditMode(true);
  };

  const removeIngredient = (idx) => {
    setEditingIngredients(editingIngredients.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx, field, value) => {
    const updated = [...editingIngredients];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditingIngredients(updated);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "low": return "text-red-400 bg-red-500/10 border-red-500/20";
      case "underpriced": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "overpriced": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "healthy": return <CheckCircle size={14} className="text-green-400" />;
      case "low": return <XCircle size={14} className="text-red-400" />;
      default: return <AlertTriangle size={14} className="text-yellow-400" />;
    }
  };

  const filteredAnalysis = analysis.filter((a) =>
    a.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-500/10 rounded-xl">
          <Calculator className="text-orange-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Food Cost Calculator</h3>
          <p className="text-xs text-gray-400">Enterprise-grade ingredient & margin analysis</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{summary.total}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Items</p>
          </div>
          <div className="bg-green-500/10 rounded-xl p-3 text-center border border-green-500/20">
            <p className="text-xl font-bold text-green-400">{summary.healthy}</p>
            <p className="text-[10px] text-green-400 uppercase tracking-wider">Healthy</p>
          </div>
          <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
            <p className="text-xl font-bold text-red-400">{summary.low}</p>
            <p className="text-[10px] text-red-400 uppercase tracking-wider">Low Margin</p>
          </div>
          <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20">
            <p className="text-xl font-bold text-yellow-400">{summary.underpriced}</p>
            <p className="text-[10px] text-yellow-400 uppercase tracking-wider">Underpriced</p>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/20">
            <p className="text-xl font-bold text-blue-400">{summary.overpriced}</p>
            <p className="text-[10px] text-blue-400 uppercase tracking-wider">Overpriced</p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase text-gray-500 tracking-widest border-b border-gray-800">
              <th className="pb-3 pr-4">Item</th>
              <th className="pb-3 pr-4">Current Price</th>
              <th className="pb-3 pr-4">Total Cost</th>
              <th className="pb-3 pr-4">Suggested</th>
              <th className="pb-3 pr-4">Margin %</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAnalysis.map((item) => (
              <tr key={item.productId} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="py-3 pr-4">
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-[10px] text-gray-500">{item.restaurant}</p>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-sm font-bold text-white">₹{item.currentPrice}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-sm text-gray-300">₹{item.totalCost}</span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={12} className="text-primary" />
                    <span className="text-sm font-medium text-primary">₹{item.suggestedPrice}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className={`text-sm font-bold ${item.actualMargin > 20 ? "text-green-400" : item.actualMargin > 10 ? "text-yellow-400" : "text-red-400"}`}>
                    {item.actualMargin}%
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    {item.status}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => { fetchItemCost(item.productId); setEditMode(false); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-lg font-bold text-white">{selectedProduct.productName}</h4>
                <p className="text-sm text-gray-400">{selectedProduct.restaurant}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-500 hover:text-white text-xl">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ingredient Cost</p>
                <p className="text-xl font-bold text-white">₹{selectedProduct.ingredientCost}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Cost</p>
                <p className="text-xl font-bold text-white">₹{selectedProduct.totalCost}</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                <p className="text-[10px] text-green-400 uppercase tracking-wider">Current Profit</p>
                <p className="text-xl font-bold text-green-400">₹{selectedProduct.profitAtCurrentPrice}</p>
              </div>
              <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                <p className="text-[10px] text-primary uppercase tracking-wider">Suggested Price</p>
                <p className="text-xl font-bold text-primary">₹{selectedProduct.suggestedPrice}</p>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <div className="flex-1 bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Current Margin</p>
                <p className={`text-lg font-bold ${selectedProduct.profitMarginAtCurrent > 20 ? "text-green-400" : "text-red-400"}`}>
                  {selectedProduct.profitMarginAtCurrent}%
                </p>
              </div>
              <div className="flex-1 bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Price Diff</p>
                <p className={`text-lg font-bold ${selectedProduct.priceDifference > 0 ? "text-yellow-400" : "text-blue-400"}`}>
                  {selectedProduct.priceDifference > 0 ? "+" : ""}₹{selectedProduct.priceDifference}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-sm font-bold text-white uppercase tracking-wider">Ingredients</h5>
                <button onClick={addIngredient} className="text-xs text-primary hover:underline">+ Add Ingredient</button>
              </div>
              {(editMode ? editingIngredients : selectedProduct.ingredients || []).map((ing, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  {editMode ? (
                    <>
                      <input value={ing.name} onChange={(e) => updateIngredient(idx, "name", e.target.value)} placeholder="Name" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white" />
                      <input type="number" value={ing.quantity} onChange={(e) => updateIngredient(idx, "quantity", parseFloat(e.target.value))} className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white" />
                      <input value={ing.unit} onChange={(e) => updateIngredient(idx, "unit", e.target.value)} placeholder="Unit" className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white" />
                      <input type="number" value={ing.unitCost} onChange={(e) => updateIngredient(idx, "unitCost", parseFloat(e.target.value))} placeholder="Cost" className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white" />
                      <button onClick={() => removeIngredient(idx)} className="text-red-400 text-sm">×</button>
                    </>
                  ) : (
                    <div className="flex-1 flex justify-between text-xs text-gray-300 py-1 border-b border-gray-800">
                      <span>{ing.name} ({ing.quantity} {ing.unit})</span>
                      <span>₹{(ing.quantity * ing.unitCost).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {!editMode ? (
                <button onClick={() => setEditMode(true)} className="flex-1 bg-primary hover:bg-primary/80 text-white font-bold py-2 rounded-xl text-sm transition-colors">
                  Edit Ingredients
                </button>
              ) : (
                <>
                  <button onClick={updateItemCost} disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl text-sm transition-colors">
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={() => setEditMode(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-xl text-sm transition-colors">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCalculator;