import React, { useEffect, useState } from "react";
import {
  Trash2,
  ShieldCheck,
  User,
  Search,
  Mail,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASEURL } from "../../config";

const roleLabels = {
  all: "All",
  user: "Customer",
  delivery_partner: "Logistics",
  restaurant_owner: "Merchant",
  admin: "System",
};

const getRoleBadge = (role) => {
  const styles = {
    admin: "bg-red-500/10 text-red-500 border-red-500/20",
    user: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    delivery_partner: "bg-green-500/10 text-green-500 border-green-500/20",
    restaurant_owner: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    default: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return styles[role] || styles.default;
};

const ROLE_FILTERS = ["all", "user", "delivery_partner", "restaurant_owner"];

const UsersTab = ({ userInfo }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/users/admin/all?limit=10000`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const usersArray = Array.isArray(data) ? data : data.data || [];
        setUsers(usersArray);
      } else {
        toast.error("Failed to load users");
      }
    } catch {
      toast.error("Network error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo) fetchUsers();
  }, [userInfo]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${BASEURL}/api/v1/users/admin/user/${userId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(`Access level updated to ${newRole.toUpperCase()}`);
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
        );
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Role update failed");
      }
    } catch {
      toast.error("Network error updating role");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this user?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`${BASEURL}/api/v1/users/admin/user/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("User deleted");
        setUsers((prev) => prev.filter((u) => u._id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Delete failed");
      }
    } catch {
      toast.error("Network error deleting user");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = loading
    ? []
    : users.filter((u) => {
        const matchesSearch =
          u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole =
          filterRole === "all" || u.role === filterRole;
        return matchesSearch && matchesRole;
      });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* ── FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-gray-900/40 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-800 shadow-2xl">
        <div className="relative w-full sm:min-w-[280px] lg:min-w-[360px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-primary transition-all"
          />
        </div>
        <div className="hidden sm:flex gap-2 flex-wrap">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${
                filterRole === role
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                  : "bg-black border-gray-800 text-gray-600 hover:text-white hover:border-gray-600"
              }`}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: role buttons in box */}
      <div className="sm:hidden bg-gray-900/60 rounded-2xl p-3">
        <div className="grid grid-cols-2 gap-2">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                filterRole === role
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-black/40 text-gray-500 hover:text-white hover:bg-gray-800"
              }`}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="hidden md:block bg-gray-950 border border-gray-900 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
              <tr>
                <th className="p-4 sm:p-6 text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">
                  User
                </th>
                <th className="p-4 sm:p-6 text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] text-center">
                  Role
                </th>
                <th className="p-4 sm:p-6 text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-4 sm:p-6" colSpan={3}>
                      <div className="flex items-center gap-4 animate-pulse">
                        <div className="w-11 h-11 bg-gray-900 rounded-xl shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-900 rounded w-1/3" />
                          <div className="h-3 bg-gray-900 rounded w-1/2" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-primary/5 transition-all group"
                  >
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center border border-gray-800 group-hover:border-primary/50 transition-all shrink-0">
                          <span className="text-lg font-black text-primary uppercase tracking-tighter">
                            {user.name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-white text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5 font-bold tracking-widest">
                            <Mail size={10} className="text-primary/60 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className="flex justify-center">
                        {user.role === "admin" ? (
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${getRoleBadge("admin")}`}
                          >
                            <ShieldCheck size={12} />
                            System
                          </div>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user._id, e.target.value)
                            }
                            className="bg-black border border-gray-800 text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-xl outline-none focus:border-primary transition-all appearance-none text-center cursor-pointer hover:text-white shadow-inner"
                          >
                            <option value="user">Customer</option>
                            <option value="delivery_partner">
                              Logistics
                            </option>
                            <option value="restaurant_owner">Merchant</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className="flex justify-center">
                        {user.role !== "admin" ? (
                          <button
                            onClick={() => handleDelete(user._id)}
                            disabled={deletingId === user._id}
                            className="p-3 bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/10 hover:border-red-500 transition-all active:scale-90 group/del disabled:opacity-40"
                          >
                            {deletingId === user._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2
                                size={16}
                                className="group-hover/del:animate-bounce"
                              />
                            )}
                          </button>
                        ) : (
                          <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 text-gray-700">
                            <ShieldAlert size={16} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <User size={32} className="mx-auto text-gray-900 mb-4" />
                    <p className="text-gray-700 font-black uppercase text-xs tracking-[0.3em]">
                      No users found
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-950 border border-gray-900 rounded-2xl p-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-gray-900 rounded w-1/2" />
                  <div className="h-2.5 bg-gray-900 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user._id}
              className="bg-gray-950 border border-gray-900 rounded-2xl p-4 hover:border-gray-800 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center border border-gray-800 shrink-0">
                  <span className="text-base font-black text-primary uppercase tracking-tighter">
                    {user.name?.charAt(0) || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm uppercase tracking-tight truncate">
                    {user.name}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold tracking-widest truncate">
                    {user.email}
                  </p>
                </div>
                {user.role !== "admin" ? (
                  <button
                    onClick={() => handleDelete(user._id)}
                    disabled={deletingId === user._id}
                    className="p-2.5 bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/10 hover:border-red-500 transition-all shrink-0 active:scale-90 disabled:opacity-40"
                  >
                    {deletingId === user._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                ) : (
                  <div className="p-2.5 bg-gray-900 rounded-xl border border-gray-800 text-gray-700 shrink-0">
                    <ShieldAlert size={14} />
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-900/50">
                {user.role === "admin" ? (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border ${getRoleBadge("admin")}`}
                  >
                    <ShieldCheck size={10} />
                    System
                  </div>
                ) : (
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(user._id, e.target.value)
                    }
                    className="w-full bg-black border border-gray-800 text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-2.5 rounded-xl outline-none focus:border-primary transition-all appearance-none text-center cursor-pointer hover:text-white"
                  >
                    <option value="user">Customer</option>
                    <option value="delivery_partner">Logistics</option>
                    <option value="restaurant_owner">Merchant</option>
                  </select>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-950 border border-gray-900 rounded-2xl p-8 text-center">
            <User size={28} className="mx-auto text-gray-900 mb-3" />
            <p className="text-gray-700 font-black uppercase text-[10px] tracking-[0.3em]">
              No users found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersTab;
