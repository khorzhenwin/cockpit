import React, { useState } from 'react';
import { UserProfile, UserPreferences, PrivacySettings } from '../../lib/models/user';

interface ProfileSettingsProps {
  user: {
    id: string;
    email: string;
    profile: UserProfile;
    preferences: UserPreferences;
    privacySettings: PrivacySettings;
  };
  onUpdateProfile: (updates: {
    profile?: Partial<UserProfile>;
    preferences?: Partial<UserPreferences>;
    privacySettings?: Partial<PrivacySettings>;
  }) => Promise<void>;
  loading?: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user,
  onUpdateProfile,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'privacy'>('profile');
  const [formData, setFormData] = useState({
    profile: user.profile,
    preferences: user.preferences,
    privacySettings: user.privacySettings
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = {};
    
    if (activeTab === 'profile') {
      updates.profile = formData.profile;
    } else if (activeTab === 'preferences') {
      updates.preferences = formData.preferences;
    } else if (activeTab === 'privacy') {
      updates.privacySettings = formData.privacySettings;
    }

    await onUpdateProfile(updates);
  };

  const updateFormData = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const updateNestedFormData = (section: string, nestedField: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [nestedField]: {
          ...(prev[section as keyof typeof prev] as any)[nestedField],
          [field]: value
        }
      }
    }));
  };

  return (
    <div className="profile-settings">
      <h2>Profile Settings</h2>
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button
          className={`tab ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy
        </button>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        {activeTab === 'profile' && (
          <div className="tab-content">
            <h3>Personal Information</h3>
            
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                value={formData.profile.demographics.age || ''}
                onChange={(e) => updateNestedFormData('profile', 'demographics', 'age', parseInt(e.target.value) || undefined)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.profile.demographics.location || ''}
                onChange={(e) => updateNestedFormData('profile', 'demographics', 'location', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Occupation</label>
              <input
                type="text"
                value={formData.profile.demographics.occupation || ''}
                onChange={(e) => updateNestedFormData('profile', 'demographics', 'occupation', e.target.value)}
                disabled={loading}
              />
            </div>

            <h3>Risk Tolerance</h3>
            
            <div className="form-group">
              <label>Financial Risk</label>
              <select
                value={formData.profile.riskTolerance.financial}
                onChange={(e) => updateNestedFormData('profile', 'riskTolerance', 'financial', e.target.value)}
                disabled={loading}
              >
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>

            <div className="form-group">
              <label>Career Risk</label>
              <select
                value={formData.profile.riskTolerance.career}
                onChange={(e) => updateNestedFormData('profile', 'riskTolerance', 'career', e.target.value)}
                disabled={loading}
              >
                <option value="stable">Stable</option>
                <option value="balanced">Balanced</option>
                <option value="ambitious">Ambitious</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="tab-content">
            <h3>Notifications</h3>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.preferences.notifications.insights}
                  onChange={(e) => updateNestedFormData('preferences', 'notifications', 'insights', e.target.checked)}
                  disabled={loading}
                />
                Receive insights notifications
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.preferences.notifications.alerts}
                  onChange={(e) => updateNestedFormData('preferences', 'notifications', 'alerts', e.target.checked)}
                  disabled={loading}
                />
                Receive alert notifications
              </label>
            </div>

            <h3>Interface</h3>
            
            <div className="form-group">
              <label>Theme</label>
              <select
                value={formData.preferences.ui.theme}
                onChange={(e) => updateNestedFormData('preferences', 'ui', 'theme', e.target.value)}
                disabled={loading}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div className="form-group">
              <label>Language</label>
              <select
                value={formData.preferences.ui.language}
                onChange={(e) => updateNestedFormData('preferences', 'ui', 'language', e.target.value)}
                disabled={loading}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="tab-content">
            <h3>Data Sharing</h3>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.privacySettings.dataSharing.allowAnalytics}
                  onChange={(e) => updateNestedFormData('privacySettings', 'dataSharing', 'allowAnalytics', e.target.checked)}
                  disabled={loading}
                />
                Allow analytics data collection
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.privacySettings.dataSharing.allowImprovement}
                  onChange={(e) => updateNestedFormData('privacySettings', 'dataSharing', 'allowImprovement', e.target.checked)}
                  disabled={loading}
                />
                Allow data for service improvement
              </label>
            </div>

            <h3>Profile Visibility</h3>
            
            <div className="form-group">
              <label>Profile Visibility</label>
              <select
                value={formData.privacySettings.visibility.profileVisibility}
                onChange={(e) => updateNestedFormData('privacySettings', 'visibility', 'profileVisibility', e.target.value)}
                disabled={loading}
              >
                <option value="private">Private</option>
                <option value="limited">Limited</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="save-button"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .profile-settings {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        h2 {
          margin-bottom: 30px;
          color: #333;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #ddd;
          margin-bottom: 30px;
        }

        .tab {
          background: none;
          border: none;
          padding: 12px 24px;
          cursor: pointer;
          font-size: 16px;
          color: #666;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #333;
        }

        .tab.active {
          color: #007bff;
          border-bottom-color: #007bff;
        }

        .settings-form {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .tab-content h3 {
          margin-bottom: 20px;
          color: #555;
          font-size: 18px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #555;
        }

        input[type="text"],
        input[type="number"],
        select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }

        .form-actions {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .save-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .save-button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .save-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};