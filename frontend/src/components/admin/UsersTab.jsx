import React, { useEffect, useState } from "react";
import {
  Trash2,
  ShieldCheck,
  User,
  Search,
  Mail,
  ShieldAlert,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../../config";

const UsersTab = ({ userInfo }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/admin/all`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (err) {
      toast.error("Failed to sync user database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo) fetchUsers();
  }, [userInfo]);

  // ✅ FIX 1: URL & Method corrected for Role Update
  const handleRoleChange = async (userId, newRole) => {
    try {
      // Backend expects: /api/v1/users/admin/user/:id
      const res = await fetch(`${BASE_URL}/api/v1/users/admin/user/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({ role: newRole }), // Send new role
      });

      if (res.ok) {
        toast.success(
          `Identity Protocol: Access level granted to ${newRole.toUpperCase()}! 🛡️`
        );
        fetchUsers(); // Refresh list
      } else {
        const err = await res.json();
        toast.error(err.message || "Protocol Failure: Role update failed");
      }
    } catch (err) {
      toast.error("Radar interference while updating role");
    }
  };

  // ✅ FIX 2: URL corrected for Delete
  const handleDelete = async (id) => {
    if (
      !window.confirm("WARNING: Permanent deletion of this identity. Proceed?")
    )
      return;
    try {
      // Backend expects: /api/v1/users/admin/user/:id
      const res = await fetch(`${BASE_URL}/api/v1/users/admin/user/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      if (res.ok) {
        toast.success("Identity scrubbed from database");
        setUsers(users.filter((u) => u._id !== id));
      } else {
        const error = await res.json();
        toast.error(error.message || "Scrub failed");
      }
    } catch (err) {
      toast.error("System connection error");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      {/* 🛠️ Tactical Filters & Search */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-center bg-gray-900/40 p-8 rounded-[3rem] border border-gray-800 shadow-2xl backdrop-blur-sm">
        <div className="relative w-full xl:w-[450px] group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by Identity (Name or Email)..."
            className="w-full bg-black/60 border border-gray-800 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-700 font-medium"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {["all", "user", "delivery_partner", "restaurant_owner"].map(
            (role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border italic ${
                  filterRole === role
                    ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105"
                    : "bg-black border-gray-800 text-gray-600 hover:text-white hover:border-gray-600"
                }`}
              >
                {role.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </div>

      {/* 👥 Identity Grid Table */}
      <div className="bg-gray-950 border border-gray-900 rounded-[3.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
              <tr>
                <th className="p-8 text-[10px] font-black uppercase text-gray-600 tracking-[0.4em]">
                  Personal Intel
                </th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] text-center">
                  Clearance Level
                </th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] text-center">
                  Terminate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900/50">
              {filteredUsers.map((user) => (
                <tr
                  key={user._id}
                  className="hover:bg-primary/5 transition-all group"
                >
                  <td className="p-8">
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 bg-gradient-to-br from-gray-900 to-black rounded-[1.5rem] flex items-center justify-center border border-gray-800 group-hover:border-primary/50 transition-all shadow-xl group-hover:rotate-3">
                        <span className="text-2xl font-black text-primary italic uppercase tracking-tighter">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-white text-lg uppercase italic tracking-tight group-hover:text-primary transition-colors">
                          {user.name}
                        </p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-2 font-bold tracking-widest">
                          <Mail size={12} className="text-primary/60" />{" "}
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col items-center gap-3">
                      {user.role === "admin" ? (
                        <div className="flex items-center gap-2 px-6 py-2 rounded-2xl text-[9px] font-black uppercase italic border-2 bg-red-500/10 text-red-500 border-red-500/20 shadow-lg shadow-red-500/10">
                          <ShieldCheck size={14} /> System Command
                        </div>
                      ) : (
                        <div className="relative w-full max-w-[200px]">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user._id, e.target.value)
                            }
                            className="w-full bg-black border border-gray-800 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-3 rounded-2xl focus:border-primary outline-none cursor-pointer hover:text-white transition-all appearance-none text-center italic shadow-inner"
                          >
                            <option value="user">Customer</option>
                            <option value="delivery_partner">Logistics</option>
                            <option value="restaurant_owner">Merchant</option>
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex justify-center">
                      {user.role !== "admin" ? (
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="p-5 bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white rounded-[1.5rem] border border-red-500/10 hover:border-red-500 transition-all shadow-xl active:scale-90 group/del"
                        >
                          <Trash2
                            size={20}
                            className="group-hover/del:animate-bounce"
                          />
                        </button>
                      ) : (
                        <div className="p-5 bg-gray-900 rounded-[1.5rem] border border-gray-800 text-gray-700">
                          <ShieldAlert size={20} />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="p-32 text-center flex flex-col items-center gap-6">
            <div className="relative">
              <Loader2 className="animate-spin text-primary" size={48} />
              <div className="absolute inset-0 bg-primary blur-3xl opacity-10"></div>
            </div>
            <p className="text-gray-600 font-black uppercase text-[10px] tracking-[0.5em] animate-pulse">
              Re-mapping Identity Matrix...
            </p>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="p-32 text-center">
            <User size={48} className="mx-auto text-gray-900 mb-6" />
            <p className="text-gray-700 font-black uppercase italic text-xs tracking-[0.3em]">
              No biological signatures detected in this sector
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersTab;
