import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiShield } from 'react-icons/fi';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

const ROLES = [
  'super_admin', 'school_owner', 'school_admin', 'principal', 'vice_principal'
];

const EMPTY_USER = { name: '', email: '', mobile: '', password: '', role: 'super_admin', schoolId: '', isActive: true };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_USER);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        platformApi.getUsers({ role: roleFilter, search }),
        platformApi.getSchools({ limit: 100 })
      ]);
      setUsers(uRes.data?.data || []);
      setSchools(sRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [roleFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await platformApi.updateUser(editing._id, payload);
        toast.success('User account updated');
      } else {
        await platformApi.createUser(form);
        toast.success('New user created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Permanently delete user ${u.email}?`)) return;
    try {
      await platformApi.deleteUser(u._id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <ConsoleLayout
      title="Platform & School Leadership Accounts"
      subtitle="Manage platform administrators and school leadership accounts. Staff, parent, and student profiles are managed in each school ERP."
      actions={
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_USER); setModalOpen(true); }}
          className="btn-primary text-xs py-2 px-4"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Platform / School Admin</span>
        </button>
      }
    >
      <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative flex-1 max-w-md">
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or mobile..." />
        </form>
        <select className="input w-full sm:w-48" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
        </select>
        <button onClick={load} className="btn-secondary text-xs">Filter</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <th className="py-3.5 px-4 font-bold">User</th>
                <th className="py-3.5 px-4 font-bold">Role</th>
                <th className="py-3.5 px-4 font-bold">Assigned School</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">No users matched your filter.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{u.name}</p>
                      <p className="text-slate-500">{u.email} {u.mobile ? `• ${u.mobile}` : ''}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role === 'super_admin' && <FiShield className="w-3 h-3" />}
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {u.school?.name || (u.role === 'super_admin' ? 'SES Educare Platform' : '—')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {u.isActive ? 'Active' : 'Locked'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditing(u);
                            setForm({
                              name: u.name, email: u.email, mobile: u.mobile || '', password: '',
                              role: u.role, schoolId: u.school?._id || '', isActive: Boolean(u.isActive)
                            });
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">{editing ? 'Edit User' : 'Create Platform / School Admin'}</h3>
              <button onClick={() => setModalOpen(false)}><FiX className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div><label className="label">Full Name *</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">Email *</label><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">10-Digit Mobile</label><input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="9876543210" /></div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role} disabled={Boolean(editing && !ROLES.includes(form.role))} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {!ROLES.includes(form.role) && <option value={form.role}>{form.role.replace('_', ' ').toUpperCase()} (managed in school ERP)</option>}
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
                </select>
              </div>
              {form.role !== 'super_admin' && (
                <div>
                  <label className="label">School *</label>
                  <select required className="input" value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}>
                    <option value="">Select School</option>
                    {schools.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">{editing ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <input type="password" autoComplete="new-password" required={!editing} minLength={8} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-brand-600" />
                <span>Account Active (can sign in)</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}
