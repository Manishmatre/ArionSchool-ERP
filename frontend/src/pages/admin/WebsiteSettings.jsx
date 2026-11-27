import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { getWebsiteSettings, updateWebsiteSettings, uploadLogo, uploadFavicon } from '../../api/websiteApi';
import { toast } from 'react-toastify';
import { FiSave, FiMail, FiPhone, FiMapPin, FiGlobe, FiFacebook, FiInstagram, FiTwitter, FiLinkedin, FiYoutube, FiUpload, FiSettings } from 'react-icons/fi';
import { toAbsoluteUrl } from '../../utils/url';
import {
  Button, FormPageLayout, FormSection, FormGrid, FormField,
} from '../../components/ui';
import { TextField, TextArea } from '../../components/ui/Input';

const WebsiteSettings = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    siteName: '',
    siteTagline: '',
    contact: {
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: ''
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getWebsiteSettings();
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load website settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await updateWebsiteSettings(settings);
      if (res.data.success) {
        toast.success('Website settings updated successfully');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update website settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type, file);

    try {
      setLoading(true);
      let res;
      if (type === 'logo') {
        res = await uploadLogo(formData);
      } else {
        res = await uploadFavicon(formData);
      }

      if (res.data.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
        fetchSettings();
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Website Settings"
        subtitle="Manage your website identity, contact info, and social media"
        icon={FiSettings}
      />

      <form onSubmit={handleSubmit}>
        <FormPageLayout
          footer={
            <Button type="submit" icon={FiSave} loading={loading} disabled={loading}>
              {loading ? 'Saving...' : 'Save All Settings'}
            </Button>
          }
        >
          <FormSection title="Site Identity" subtitle="Your brand name, tagline and logos" icon={FiGlobe}>
            <FormGrid cols={2}>
              <TextField
                label="Site Name"
                name="siteName"
                value={settings.siteName || ''}
                onChange={handleChange}
                placeholder="e.g. Arion School"
              />
              <TextField
                label="Site Tagline"
                name="siteTagline"
                value={settings.siteTagline || ''}
                onChange={handleChange}
                placeholder="e.g. Empowering Education"
              />
            </FormGrid>

            <div className="mt-4 flex flex-col sm:flex-row gap-6">
              <FormField label="Logo">
                <div className="flex items-center gap-4">
                  {settings.logo && (
                    <img src={toAbsoluteUrl(settings.logo)} alt="Logo" className="h-12 w-auto object-contain border border-slate-200 rounded p-1" />
                  )}
                  <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg px-4 py-2 flex items-center gap-2 transition">
                    <FiUpload className="text-slate-500" />
                    <span className="text-sm text-slate-600">Upload Logo</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')} accept="image/*" />
                  </label>
                </div>
              </FormField>
              <FormField label="Favicon">
                <div className="flex items-center gap-4">
                  {settings.favicon && (
                    <img src={toAbsoluteUrl(settings.favicon)} alt="Favicon" className="h-8 w-8 object-contain border border-slate-200 rounded p-1" />
                  )}
                  <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg px-4 py-2 flex items-center gap-2 transition">
                    <FiUpload className="text-slate-500" />
                    <span className="text-sm text-slate-600">Upload Favicon</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'favicon')} accept="image/*" />
                  </label>
                </div>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Contact Information" subtitle="How visitors can reach you" icon={FiPhone}>
            <FormGrid cols={3}>
              <FormField label="Contact Email">
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input
                    type="email"
                    name="contact.email"
                    value={settings.contact?.email || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                </div>
              </FormField>
              <FormField label="Phone Number">
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input
                    type="text"
                    name="contact.phone"
                    value={settings.contact?.phone || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                </div>
              </FormField>
              <FormField label="WhatsApp Number">
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input
                    type="text"
                    name="contact.whatsapp"
                    value={settings.contact?.whatsapp || ''}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                </div>
              </FormField>
              <TextArea
                label="Full Address"
                name="contact.address"
                value={settings.contact?.address || ''}
                onChange={handleChange}
                rows={2}
                className="md:col-span-3"
              />
              <TextField label="City" name="contact.city" value={settings.contact?.city || ''} onChange={handleChange} />
              <TextField label="State" name="contact.state" value={settings.contact?.state || ''} onChange={handleChange} />
              <TextField label="Pincode" name="contact.pincode" value={settings.contact?.pincode || ''} onChange={handleChange} />
            </FormGrid>
          </FormSection>

          <FormSection title="Social Media Links" subtitle="Link your social profiles" icon={FiFacebook}>
            <FormGrid cols={2}>
              <FormField label="Facebook URL">
                <div className="relative">
                  <FiFacebook className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input type="text" name="socialMedia.facebook" value={settings.socialMedia?.facebook || ''} onChange={handleChange} className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
              </FormField>
              <FormField label="Instagram URL">
                <div className="relative">
                  <FiInstagram className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input type="text" name="socialMedia.instagram" value={settings.socialMedia?.instagram || ''} onChange={handleChange} className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
              </FormField>
              <FormField label="Twitter URL">
                <div className="relative">
                  <FiTwitter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input type="text" name="socialMedia.twitter" value={settings.socialMedia?.twitter || ''} onChange={handleChange} className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
              </FormField>
              <FormField label="LinkedIn URL">
                <div className="relative">
                  <FiLinkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input type="text" name="socialMedia.linkedin" value={settings.socialMedia?.linkedin || ''} onChange={handleChange} className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
              </FormField>
              <FormField label="YouTube URL">
                <div className="relative">
                  <FiYoutube className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                  <input type="text" name="socialMedia.youtube" value={settings.socialMedia?.youtube || ''} onChange={handleChange} className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm text-slate-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" />
                </div>
              </FormField>
            </FormGrid>
          </FormSection>
        </FormPageLayout>
      </form>
    </Layout>
  );
};

export default WebsiteSettings;

