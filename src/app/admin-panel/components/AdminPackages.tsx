'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, X, Star } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';

interface CreditPackage {
  id: string;
  name: string;
  price: number;
  credits: number;
  popular: boolean;
  active: boolean;
  totalSold: number;
  revenue: number;
  description: string;
}

const initialPackages: CreditPackage[] = [
  { id: 'pkg-admin-1', name: 'Starter', price: 250, credits: 5, popular: false, active: true, totalSold: 312, revenue: 78000, description: 'Perfect for new players trying out the club' },
  { id: 'pkg-admin-2', name: 'Standard', price: 450, credits: 10, popular: true, active: true, totalSold: 687, revenue: 309150, description: 'Most popular — great value for regular players' },
  { id: 'pkg-admin-3', name: 'Premium', price: 800, credits: 20, popular: false, active: true, totalSold: 241, revenue: 192800, description: 'Best value per credit for frequent players' },
  { id: 'pkg-admin-4', name: 'Monthly Pass', price: 1500, credits: 40, popular: false, active: false, totalSold: 88, revenue: 132000, description: 'Unlimited play for dedicated members (seasonal)' },
];

interface PackageFormData {
  name: string;
  price: string;
  credits: string;
  description: string;
  popular: boolean;
}

const emptyForm: PackageFormData = { name: '', price: '', credits: '', description: '', popular: false };

export default function AdminPackages() {
  const [packages, setPackages] = useState<CreditPackage[]>(initialPackages);
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<CreditPackage | null>(null);
  const [deletingPkg, setDeletingPkg] = useState<CreditPackage | null>(null);
  const [form, setForm] = useState<PackageFormData>(emptyForm);

  const openAdd = () => {
    setEditingPkg(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (pkg: CreditPackage) => {
    setEditingPkg(pkg);
    setForm({ name: pkg.name, price: String(pkg.price), credits: String(pkg.credits), description: pkg.description, popular: pkg.popular });
    setShowForm(true);
  };

  const handleSave = () => {
    const price = parseInt(form.price, 10);
    const credits = parseInt(form.credits, 10);
    if (!form.name || isNaN(price) || isNaN(credits)) { toast.error('Please fill in all required fields.'); return; }
    if (editingPkg) {
      setPackages((prev) => prev.map((p) => p.id === editingPkg.id ? { ...p, name: form.name, price, credits, description: form.description, popular: form.popular } : p));
      toast.success(`${form.name} package updated.`);
    } else {
      const newPkg: CreditPackage = {
        id: `pkg-admin-${Date.now()}`,
        name: form.name, price, credits,
        popular: form.popular, active: true,
        totalSold: 0, revenue: 0,
        description: form.description,
      };
      setPackages((prev) => [...prev, newPkg]);
      toast.success(`${form.name} package created.`);
    }
    setShowForm(false);
  };

  const handleDelete = () => {
    if (!deletingPkg) return;
    setPackages((prev) => prev.filter((p) => p.id !== deletingPkg.id));
    toast.success(`${deletingPkg.name} package deleted.`);
    setDeletingPkg(null);
  };

  const toggleActive = (pkg: CreditPackage) => {
    setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, active: !p.active } : p));
    toast.success(`${pkg.name} ${pkg.active ? 'deactivated' : 'activated'}.`);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{packages.filter((p) => p.active).length} active packages · {packages.filter((p) => !p.active).length} inactive</p>
        <button onClick={openAdd} className="btn-primary text-xs gap-1.5 py-2">
          <Plus size={14} />
          Create Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative bg-card border-2 rounded-xl p-5 shadow-card transition-all duration-200 ${
              !pkg.active ? 'opacity-60 border-dashed border-border' : pkg.popular ?'border-primary': 'border-border hover:border-primary/30'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-4">
                <span className="gradient-amber text-white text-2xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star size={10} />
                  POPULAR
                </span>
              </div>
            )}
            {!pkg.active && (
              <div className="absolute -top-3 right-4">
                <span className="bg-muted text-muted-foreground text-2xs font-bold px-2 py-1 rounded-full">INACTIVE</span>
              </div>
            )}

            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center">
                <Tag size={18} className="text-white" />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(pkg)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => setDeletingPkg(pkg)} className="p-1.5 rounded-lg hover:bg-negative/10 hover:text-negative transition-colors text-muted-foreground">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-foreground text-lg">{pkg.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{pkg.description}</p>

            <div className="flex items-end gap-1 mb-1">
              <span className="text-2xl font-extrabold tabular-nums text-foreground">₱{pkg.price}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              <span className="font-semibold text-foreground">{pkg.credits} credits</span> · ₱{(pkg.price / pkg.credits).toFixed(0)}/credit
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted/40 rounded-lg">
              <div>
                <p className="text-base font-extrabold tabular-nums text-foreground">{pkg.totalSold}</p>
                <p className="text-2xs text-muted-foreground">Total Sold</p>
              </div>
              <div>
                <p className="text-base font-extrabold tabular-nums text-foreground">₱{(pkg.revenue / 1000).toFixed(0)}k</p>
                <p className="text-2xs text-muted-foreground">Revenue</p>
              </div>
            </div>

            <button
              onClick={() => toggleActive(pkg)}
              className={`w-full py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${pkg.active ? 'bg-muted text-muted-foreground hover:bg-secondary' : 'btn-primary'}`}
            >
              {pkg.active ? 'Deactivate Package' : 'Activate Package'}
            </button>
          </div>
        ))}
      </div>

      {/* Package form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md p-6 slide-up">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted">
              <X size={16} className="text-muted-foreground" />
            </button>
            <h3 className="font-semibold text-foreground mb-5">{editingPkg ? 'Edit Package' : 'Create Credit Package'}</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Package Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekend Special" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Price (₱)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="450" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Credits Included</label>
                  <input type="number" value={form.credits} onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))} placeholder="10" className="input-field" />
                </div>
              </div>
              {form.price && form.credits && !isNaN(parseInt(form.price)) && !isNaN(parseInt(form.credits)) && parseInt(form.credits) > 0 && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Rate: ₱{(parseInt(form.price) / parseInt(form.credits)).toFixed(0)} per credit
                </p>
              )}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description for players" className="input-field" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm((f) => ({ ...f, popular: !f.popular }))}
                  className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center ${form.popular ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ml-0.5 ${form.popular ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-xs font-semibold text-foreground">Mark as Popular</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} className="btn-primary flex-1">{editingPkg ? 'Save Changes' : 'Create Package'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deletingPkg}
        title={`Delete "${deletingPkg?.name}" package?`}
        description="This will permanently remove this credit package. Players who already purchased credits will not be affected."
        confirmLabel="Delete Package"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingPkg(null)}
      />
    </>
  );
}