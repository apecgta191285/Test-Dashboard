import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import api from '../lib/api';

interface GoogleAdsAccount {
  id: string;
  customerName: string | null;
  name: string | null;
  status: string | null;
  customerId: string;
  lastSyncAt: string | null;
  createdAt: string;
}

interface Campaign {
  externalId: string;
  name: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  metrics: {
    impressions: number;
    clicks: number;
    cost: number;
  };
}

interface FetchResult {
  accountId: string;
  accountName: string;
  customerId: string;
  campaigns: Campaign[];
  totalCampaigns: number;
}

export default function Integrations() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute('/integrations');
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [fetchedCampaigns, setFetchedCampaigns] = useState<FetchResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check for OAuth success/error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const accountId = urlParams.get('account_id');

    if (success === 'true' && accountId) {
      setMessage({ type: 'success', text: `✅ เชื่อมต่อ Google Ads สำเร็จ! Account ID: ${accountId}` });
      // Clean URL
      setLocation('/integrations');
    } else if (error) {
      setMessage({ type: 'error', text: `❌ เกิดข้อผิดพลาด: ${error}` });
      setLocation('/integrations');
    }

    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations/google-ads/accounts');

      if (response.data.success && response.data.accounts) {
        setAccounts(response.data.accounts);

        // Select first account by default if none selected
        if (response.data.accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(response.data.accounts[0].id);
        }
      }
    } catch (error: any) {
      console.error('Error loading accounts:', error);
      setMessage({ type: 'error', text: 'ไม่สามารถโหลดรายการ accounts ได้' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await api.get('/integrations/google-ads/auth-url');
      const { authUrl } = response.data;
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error getting auth URL:', error);
      setMessage({ type: 'error', text: 'ไม่สามารถเริ่มกระบวนการเชื่อมต่อได้' });
    }
  };

  const handleFetchCampaigns = async () => {
    if (!selectedAccountId) {
      setMessage({ type: 'error', text: 'กรุณาเลือก Account ก่อน' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const response = await api.get(`/integrations/google-ads/campaigns/${selectedAccountId}/fetch`);
      setFetchedCampaigns(response.data);
      setMessage({
        type: 'success',
        text: `✅ ดึงข้อมูล ${response.data.totalCampaigns} campaigns สำเร็จ!`
      });
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'ไม่สามารถดึงข้อมูล campaigns ได้'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCampaigns = async () => {
    if (!selectedAccountId) {
      setMessage({ type: 'error', text: 'กรุณาเลือก Account ก่อน' });
      return;
    }

    try {
      setSyncing(true);
      setMessage(null);
      const response = await api.post(`/integrations/google-ads/campaigns/${selectedAccountId}/sync`);
      setMessage({
        type: 'success',
        text: `✅ Sync สำเร็จ! สร้างใหม่ ${response.data.createdCount} รายการ, อัพเดท ${response.data.updatedCount} รายการ`
      });
      // Reload accounts to update lastSyncAt
      await loadAccounts();
    } catch (error: any) {
      console.error('Error syncing campaigns:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'ไม่สามารถ sync campaigns ได้'
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Google Ads Integration</h1>
        <p className="text-gray-600">เชื่อมต่อและซิงค์ข้อมูล campaigns จาก Google Ads</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
          {message.text}
        </div>
      )}

      {/* Connect Button */}
      <div className="mb-6">
        <button
          onClick={handleConnect}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          + เชื่อมต่อ Google Ads Account ใหม่
        </button>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Connected Accounts</h2>

        {loading && !fetchedCampaigns ? (
          <p className="text-gray-500">กำลังโหลด...</p>
        ) : accounts.length === 0 ? (
          <p className="text-gray-500">ยังไม่มี account ที่เชื่อมต่อ</p>
        ) : (
          <div className="space-y-4">
            {/* Account Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Google Ads Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading || syncing}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name || account.customerName || `Account ${account.customerId}`} ({account.customerId})
                    {account.status && ` - ${account.status}`}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                {accounts.length} account(s) connected
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleFetchCampaigns}
                disabled={loading || !selectedAccountId}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {loading ? 'กำลังดึงข้อมูล...' : 'Fetch Campaigns'}
              </button>
              <button
                onClick={handleSyncCampaigns}
                disabled={syncing || loading || !selectedAccountId}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 transition"
              >
                {syncing ? 'กำลัง Sync...' : 'Sync to DB'}
              </button>
            </div>

            {/* Selected Account Info */}
            {selectedAccountId && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                {(() => {
                  const account = accounts.find(a => a.id === selectedAccountId);
                  if (!account) return null;
                  return (
                    <div>
                      <h3 className="font-semibold text-lg">
                        {account.name || account.customerName || `Account ${account.customerId}`}
                      </h3>
                      <p className="text-sm text-gray-600">Customer ID: {account.customerId}</p>
                      <p className="text-sm text-gray-600">
                        Last Sync: {account.lastSyncAt
                          ? new Date(account.lastSyncAt).toLocaleString('th-TH')
                          : 'ยังไม่เคย sync'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fetched Campaigns */}
      {fetchedCampaigns && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">
            Campaigns from {fetchedCampaigns.accountName} ({fetchedCampaigns.totalCampaigns} campaigns)
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impressions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fetchedCampaigns.campaigns.map((campaign) => (
                  <tr key={campaign.externalId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{campaign.externalId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{campaign.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.metrics.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.metrics.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${campaign.metrics.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
