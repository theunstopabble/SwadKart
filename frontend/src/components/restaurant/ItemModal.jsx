import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  PlusCircle,
  Trash2,
  Upload,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../../config";
import { useSelector } from "react-redux";

const ItemModal = ({
  showModal,
  setShowModal,
  isEditing,
  newItem,
  setNewItem,
  handleSubmitItem,
}) => {
  const { userInfo } = useSelector((state) => state.user);
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState("url"); // 'url' or 'upload'

  // --- Logic to detect if editing existing item is URL or Uploaded ---
  useEffect(() => {
    if (showModal && newItem.image) {
      // Agar image hai, aur wo Cloudinary ki nahi hai, to URL mode maan lo
      // (Waise default URL mode safe rehta hai edit ke time)
      if (!newItem.image.includes("cloudinary")) {
        setImageMode("url");
      } else {
        setImageMode("upload");
      }
    }
  }, [showModal, newItem.image]);

  if (!showModal) return null;

  // --- Handlers for Image Upload ---
  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setNewItem({ ...newItem, image: data.image });
        toast.success("Image uploaded to cloud! ☁️");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (error) {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  // --- Handlers for Dynamic Fields (Variants & Addons) ---
  const handleAddVariant = () =>
    setNewItem({
      ...newItem,
      variants: [...newItem.variants, { name: "", price: "" }],
    });

  const handleRemoveVariant = (index) =>
    setNewItem({
      ...newItem,
      variants: newItem.variants.filter((_, i) => i !== index),
    });

  const handleVariantChange = (index, field, value) => {
    const updated = [...newItem.variants];
    updated[index][field] = value;
    setNewItem({ ...newItem, variants: updated });
  };

  const handleAddAddon = () =>
    setNewItem({
      ...newItem,
      addons: [...newItem.addons, { name: "", price: "" }],
    });

  const handleRemoveAddon = (index) =>
    setNewItem({
      ...newItem,
      addons: newItem.addons.filter((_, i) => i !== index),
    });

  const handleAddonChange = (index, field, value) => {
    const updated = [...newItem.addons];
    updated[index][field] = value;
    setNewItem({ ...newItem, addons: updated });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-6 right-6 text-gray-500 hover:text-white bg-black/40 p-2 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-8 border-l-4 border-primary pl-4">
          {isEditing ? "Edit Menu Item" : "Add New Dish"}
        </h2>

        <form onSubmit={handleSubmitItem} className="space-y-6">
          {/* Item Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
              Item Name
            </label>
            <input
              type="text"
              className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none transition-all uppercase font-bold placeholder-gray-700"
              placeholder="e.g. Maharajas Burger"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Price */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                Base Price (₹)
              </label>
              <input
                type="number"
                className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none transition-all font-black italic placeholder-gray-700"
                placeholder="299"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
                required
              />
            </div>

            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                Food Category
              </label>
              <select
                className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-xs text-white focus:border-primary outline-none transition-all font-bold uppercase"
                value={newItem.isVeg}
                onChange={(e) =>
                  setNewItem({ ...newItem, isVeg: e.target.value })
                }
              >
                <option value="true">🟢 Pure Veg</option>
                <option value="false">🔴 Non-Veg</option>
              </select>
            </div>
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
              Menu Category
            </label>
            <input
              type="text"
              className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none transition-all uppercase font-bold placeholder-gray-700"
              placeholder="e.g. Starters, Main Course"
              value={newItem.category}
              onChange={(e) =>
                setNewItem({ ...newItem, category: e.target.value })
              }
              required
            />
          </div>

          {/* 🔥 NEW: Image Upload & URL Logic */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                Dish Image
              </label>
              {/* Toggle Buttons */}
              <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    imageMode === "url"
                      ? "bg-black text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Paste Link
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    imageMode === "upload"
                      ? "bg-black text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              {/* INPUT AREA */}
              <div className="flex-1">
                {imageMode === "url" ? (
                  // 👉 OPTION 1: URL INPUT
                  <div className="relative group">
                    <LinkIcon
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-black border border-gray-800 rounded-2xl p-4 pl-12 text-sm text-white focus:border-primary outline-none transition-all font-mono placeholder-gray-700"
                      value={newItem.image}
                      onChange={(e) =>
                        setNewItem({ ...newItem, image: e.target.value })
                      }
                    />
                  </div>
                ) : (
                  // 👉 OPTION 2: FILE UPLOAD
                  <div className="relative group w-full">
                    <input
                      type="file"
                      onChange={uploadFileHandler}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full bg-black border border-dashed border-gray-800 rounded-2xl p-4 text-xs text-gray-500 flex items-center justify-center gap-2 group-hover:border-primary transition-all">
                      {uploading ? (
                        <Loader2
                          size={16}
                          className="animate-spin text-primary"
                        />
                      ) : (
                        <Upload size={16} />
                      )}
                      {newItem.image ? "Change File" : "Click to Upload"}
                    </div>
                  </div>
                )}
              </div>

              {/* PREVIEW AREA */}
              {newItem.image && (
                <div className="shrink-0">
                  <img
                    src={newItem.image}
                    alt="preview"
                    className="h-14 w-14 rounded-2xl object-cover border border-gray-800 shadow-xl bg-black"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/150?text=No+Img";
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          {/* 👇 MISSING DESCRIPTION FIELD ADDED HERE 👇 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
              Description
            </label>
            <textarea
              rows="3"
              className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none transition-all font-medium placeholder-gray-700 resize-none"
              placeholder="Describe this delicious item (ingredients, taste)..."
              value={newItem.description}
              onChange={(e) =>
                setNewItem({ ...newItem, description: e.target.value })
              }
              required
            ></textarea>
          </div>

          {/* Variants Section */}
          <div className="bg-black/40 p-5 rounded-3xl border border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2 tracking-[0.2em]">
                <Layers size={14} className="text-primary" /> Size Variants
              </h4>
              <button
                type="button"
                onClick={handleAddVariant}
                className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase hover:bg-primary/20 transition-colors"
              >
                + Add
              </button>
            </div>
            {newItem.variants.map((v, i) => (
              <div
                key={i}
                className="flex gap-2 animate-in slide-in-from-right-2 duration-300"
              >
                <input
                  type="text"
                  placeholder="Small / Half"
                  className="w-2/3 bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-primary"
                  value={v.name}
                  onChange={(e) =>
                    handleVariantChange(i, "name", e.target.value)
                  }
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  className="w-1/4 bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-primary"
                  value={v.price}
                  onChange={(e) =>
                    handleVariantChange(i, "price", e.target.value)
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(i)}
                  className="text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* Add-ons Section */}
          <div className="bg-black/40 p-5 rounded-3xl border border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2 tracking-[0.2em]">
                <PlusCircle size={14} className="text-green-500" /> Extras /
                Add-ons
              </h4>
              <button
                type="button"
                onClick={handleAddAddon}
                className="text-[10px] font-black bg-green-500/10 text-green-500 px-3 py-1 rounded-full uppercase hover:bg-green-500/20 transition-colors"
              >
                + Add
              </button>
            </div>
            {newItem.addons.map((a, i) => (
              <div
                key={i}
                className="flex gap-2 animate-in slide-in-from-right-2 duration-300"
              >
                <input
                  type="text"
                  placeholder="Extra Cheese"
                  className="w-2/3 bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-green-500"
                  value={a.name}
                  onChange={(e) => handleAddonChange(i, "name", e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  className="w-1/4 bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-green-500"
                  value={a.price}
                  onChange={(e) =>
                    handleAddonChange(i, "price", e.target.value)
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAddon(i)}
                  className="text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className={`w-full font-black py-4 rounded-2xl transition-all uppercase text-xs tracking-[0.2em] shadow-xl ${
              uploading
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-primary hover:bg-red-600 text-white shadow-primary/20"
            }`}
          >
            {uploading
              ? "Uploading Image..."
              : isEditing
              ? "Save Changes"
              : "Create Item"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ItemModal;
