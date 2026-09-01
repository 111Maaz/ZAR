import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { logAuditEvent } from '@/lib/audit';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PageHeader } from '@/components/ui/PageHeader';

export function ShopCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    shop_name: '',
    owner_name: '',
    owner_email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    state: '',
    country: '',
    business_contact: '',
    supabase_project_url: '',
    supabase_anon_key: '',
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.shop_name.trim()) e.shop_name = 'Shop name is required';
    if (!form.owner_name.trim()) e.owner_name = 'Owner name is required';
    if (!form.owner_email.trim()) e.owner_email = 'Owner email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email)) e.owner_email = 'Invalid email format';
    if (form.supabase_project_url && !/^https?:\/\/.+/.test(form.supabase_project_url))
      e.supabase_project_url = 'Must be a valid URL (starting with http:// or https://)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('shops')
        .insert({
          shop_name: form.shop_name.trim(),
          owner_name: form.owner_name.trim(),
          owner_email: form.owner_email.trim(),
          phone: form.phone.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          country: form.country.trim() || null,
          business_contact: form.business_contact.trim() || null,
          supabase_project_url: form.supabase_project_url.trim() || null,
          supabase_anon_key: form.supabase_anon_key.trim() || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'Admin created Shop',
        shop_id: data.id,
        metadata: { shop_name: form.shop_name, owner_email: form.owner_email },
      });

      toast('Shop created successfully.', 'success');
      navigate(`/shops/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create shop';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setErrors({ owner_email: 'A shop with this email already exists' });
      } else {
        toast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Add Shop" description="Create a new shop owner account" />

      <div className="mb-4">
        <Link to="/shops" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to shops
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Business Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Shop Name"
              required
              value={form.shop_name}
              onChange={(e) => update('shop_name', e.target.value)}
              error={errors.shop_name}
              placeholder="e.g. Elegant Invitations Co."
            />
            <Input
              label="Business Contact"
              value={form.business_contact}
              onChange={(e) => update('business_contact', e.target.value)}
              placeholder="Business phone or contact"
            />
          </div>
        </Card>

        <Card className="mb-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Owner Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Owner Name"
              required
              value={form.owner_name}
              onChange={(e) => update('owner_name', e.target.value)}
              error={errors.owner_name}
              placeholder="Full name"
            />
            <Input
              label="Owner Email"
              type="email"
              required
              value={form.owner_email}
              onChange={(e) => update('owner_email', e.target.value)}
              error={errors.owner_email}
              placeholder="owner@example.com"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
        </Card>

        <Card className="mb-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Address</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Textarea
                label="Street Address"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Full street address"
              />
            </div>
            <Input
              label="City"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="City"
            />
            <Input
              label="State / Province"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              placeholder="State or province"
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              placeholder="Country"
            />
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="mb-1 text-sm font-semibold text-gray-900">Shop Supabase Configuration</h3>
          <p className="mb-4 text-xs text-gray-500">
            Each shop has its own separate Supabase project. Enter the shop's project URL and anon key (public-safe).
            Never store service-role keys here — they must be supplied through secure server-side configuration.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Supabase Project URL"
              value={form.supabase_project_url}
              onChange={(e) => update('supabase_project_url', e.target.value)}
              error={errors.supabase_project_url}
              placeholder="https://your-project.supabase.co"
              hint="The shop's own Supabase project URL"
            />
            <Input
              label="Supabase Anon Key"
              value={form.supabase_anon_key}
              onChange={(e) => update('supabase_anon_key', e.target.value)}
              placeholder="Public anon key (client-safe)"
              hint="Public-safe key only. Never enter service-role keys."
            />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link to="/shops">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            {loading ? 'Creating...' : 'Create Shop'}
          </Button>
        </div>
      </form>
    </div>
  );
}
