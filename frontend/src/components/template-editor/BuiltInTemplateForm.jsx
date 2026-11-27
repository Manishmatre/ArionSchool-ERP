import { useMemo, useRef } from 'react';
import { toast } from 'react-toastify';

// Guided template builder: the system arranges selected fields automatically.
export default function BuiltInTemplateForm({ title, description, templateData: data, setTemplateData: setData, fieldCatalog: catalog, metaSection, onSave, loading, pageFormat, saveLabel = 'Save template', card = false }) {
  const inputRef = useRef(null);
  const selected = useMemo(() => new Set((data.fields || []).map((field) => field.fieldName)), [data.fields]);
  const toggle = (item) => setData((prev) => {
    const current = new Map((prev.fields || []).map((field) => [field.fieldName, field]));
    if (current.has(item.value)) current.delete(item.value);
    else current.set(item.value, { fieldName: item.value, fieldType: item.type, label: item.label, x: card ? 35 : 90, y: (card ? 40 : 260) + current.size * (card ? 34 : 48), width: card ? 250 : 500, height: 32, fontSize: 20, fontFamily: 'Arial', fontWeight: item.value === 'studentName' ? 'bold' : 'normal', color: '#172033', alignment: 'center', zIndex: 0 });
    return { ...prev, fields: [...current.values()] };
  });
  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { toast.error('Choose an image under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setData((prev) => ({ ...prev, templateImage: reader.result }));
    reader.onerror = () => toast.error('Could not read the selected image');
    reader.readAsDataURL(file);
  };
  return <section className="mx-auto max-w-5xl space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
    <div><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{metaSection}<label className="block text-sm font-semibold text-slate-700">Template name<input required value={data.name} onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" placeholder="e.g. Annual result 2026" /></label><label className="block text-sm font-semibold text-slate-700">Description<input value={data.description || ''} onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" placeholder="Optional" /></label></div>
    <div className="grid gap-5 md:grid-cols-[1fr_260px]"><div><div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-slate-900">Choose what to print</h3><button type="button" className="text-sm font-semibold text-blue-700" onClick={() => setData((p) => ({ ...p, fields: selected.size === catalog.length ? [] : catalog.map((f) => ({ fieldName: f.value, fieldType: f.type, label: f.label, x: card ? 35 : 90, y: (card ? 40 : 260) + (catalog.indexOf(f) * (card ? 34 : 48)), width: card ? 250 : 500, height: 32, fontSize: 20, color: '#172033', alignment: 'center' })) }))}>{selected.size === catalog.length ? 'Clear all' : 'Select all'}</button></div><div className="grid gap-2 sm:grid-cols-2">{catalog.map((item) => <label key={item.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 hover:border-blue-400"><input type="checkbox" checked={selected.has(item.value)} onChange={() => toggle(item)} className="h-4 w-4 accent-blue-600" />{item.label}</label>)}</div></div>
    <div><h3 className="mb-3 font-bold text-slate-900">Background image</h3><input ref={inputRef} type="file" accept="image/*" onChange={upload} className="hidden"/><button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-lg border border-dashed border-blue-400 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">Upload background (max 5 MB)</button>{data.templateImage && <div className="mt-3"><img src={data.templateImage} alt="Template background preview" className="max-h-64 w-full rounded-lg border object-contain"/><button type="button" onClick={() => setData((p) => ({ ...p, templateImage: '' }))} className="mt-2 text-sm text-rose-700">Remove background</button></div>}<p className="mt-2 text-xs text-slate-500">Fields are placed automatically over your artwork. Choose a high resolution image for print.</p></div></div>
    <div className="flex items-center justify-between border-t pt-5"><span className="text-sm text-slate-600">{selected.size} fields selected</span><button disabled={loading || !data.name || !selected.size} onClick={() => onSave(data)} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Saving…' : saveLabel}</button></div>
  </section>;
}

