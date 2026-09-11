import React, { useEffect, useRef, useState } from 'react';
import {
  Settings,
  Scale,
  Key,
  Volume2,
  VolumeX,
  Clock,
  Download,
  Upload,
  FileCode,
  RotateCcw,
  Check,
  Shield,
  AlertCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { AppTheme, CompletedWorkout, ExerciseTemplate, UserSettings, WeightUnit } from '../types';
import { downloadStandaloneHTML, exportBackupJSON } from '../services/storage';
import { THEMES, applyAppTheme } from '../services/theme';

interface SettingsTabProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  workouts: CompletedWorkout[];
  customExercises: ExerciseTemplate[];
  onImportBackup: (importedData: {
    settings?: UserSettings;
    workouts?: CompletedWorkout[];
    customExercises?: ExerciseTemplate[];
  }) => void;
  onClearAllData: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  workouts,
  customExercises,
  onImportBackup,
  onClearAllData,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(settings.geminiApiKey || '');
  const [isSaved, setIsSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasServerKey === 'boolean') {
          setHasServerKey(data.hasServerKey);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveApiKey = () => {
    onUpdateSettings({
      ...settings,
      geminiApiKey: apiKeyInput.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleThemeChange = (theme: AppTheme) => {
    applyAppTheme(theme);
    onUpdateSettings({ ...settings, theme });
  };

  const handleUnitChange = (unit: WeightUnit) => {
    onUpdateSettings({ ...settings, unit });
  };

  const handleRestChange = (seconds: number) => {
    onUpdateSettings({ ...settings, defaultRestSeconds: seconds });
  };

  const handleRestTimerToggle = () => {
    onUpdateSettings({ ...settings, restTimerEnabled: !settings.restTimerEnabled });
  };

  const handleSoundToggle = () => {
    onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  };

  const handleAutoCollapseToggle = () => {
    onUpdateSettings({
      ...settings,
      autoCollapseCompleted: settings.autoCollapseCompleted === false ? true : false,
    });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && (json.workouts || json.customExercises || json.settings)) {
          onImportBackup(json);
          setImportStatus('Backup successfully restored!');
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus('Invalid backup file format');
          setTimeout(() => setImportStatus(null), 3000);
        }
      } catch {
        setImportStatus('Failed to parse backup JSON file');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const themeList: AppTheme[] = ['midnight', 'electric', 'lime', 'monochrome'];

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header (Screenshot 5) */}
      <div className="pt-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-theme-accent">
          MAKE IT YOURS
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
          Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Your device. Your data. Your preferences.
        </p>
      </div>

      {/* Appearance Card (Screenshot 5) */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Appearance</h3>
          <p className="text-xs text-slate-400 mt-0.5">Pick the energy that feels like you.</p>
        </div>

        {/* Color Themes List */}
        <div className="space-y-2">
          {themeList.map((tKey) => {
            const t = THEMES[tKey];
            const isSelected = (settings.theme || 'midnight') === tKey;

            return (
              <div
                key={tKey}
                id={`theme-option-${tKey}`}
                onClick={() => handleThemeChange(tKey)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-theme-accent-bg border-theme-border text-white shadow-sm'
                    : 'bg-[#191a27] border-[#292b3d] text-slate-300 hover:border-[#383a52]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Two-dot preview badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.previewColor }}
                    />
                    <span
                      className="w-3 h-3 rounded-full opacity-80"
                      style={{ backgroundColor: t.dotColor }}
                    />
                  </div>
                  <span className="text-xs font-bold">{t.name}</span>
                </div>

                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-theme-accent text-[#0d0a18] flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-600" />
                )}
              </div>
            );
          })}
        </div>

        {/* Rest Timer Switch (Screenshot 5) */}
        <div className="flex items-center justify-between pt-3 border-t border-[#242638]">
          <div>
            <span className="text-xs font-semibold text-white block">Rest timer</span>
            <span className="text-[11px] text-slate-400">Countdown timer between logged sets</span>
          </div>
          <button
            id="settings-rest-timer-toggle"
            onClick={handleRestTimerToggle}
            className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors ${
              settings.restTimerEnabled ? 'bg-theme-accent justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <div className="bg-[#0f0d1a] w-5 h-5 rounded-full shadow-md transform" />
          </button>
        </div>

        {/* Default Duration Dropdown (Screenshot 5) */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-semibold text-white">Default duration</span>
          <div className="relative">
            <select
              id="settings-rest-duration-select"
              value={settings.defaultRestSeconds || 120}
              onChange={(e) => handleRestChange(Number(e.target.value))}
              className="appearance-none px-3.5 py-1.5 rounded-xl bg-[#191a27] border border-[#292b3d] text-xs font-bold text-theme-light pr-8 focus:outline-none cursor-pointer"
            >
              <option value={60}>60 seconds</option>
              <option value={90}>90 seconds</option>
              <option value={120}>120 seconds</option>
              <option value={180}>180 seconds</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Informational Convention Note (Screenshot 5) */}
        <p className="text-xs text-slate-400 pt-2 border-t border-[#242638] leading-relaxed">
          Weights: pounds. Dumbbell weights are per dumbbell. Keep the same convention across
          sessions.
        </p>
      </div>

      {/* Measurement & Units */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">Measurement & Audio</h3>

        {/* Units Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[#242638]">
          <div>
            <div className="text-xs font-semibold text-white">Weight Units</div>
            <p className="text-[11px] text-slate-400">Pounds (LBS) or Kilograms (KG)</p>
          </div>

          <div className="flex rounded-2xl bg-[#191a27] p-1 border border-[#282a3d]">
            <button
              onClick={() => handleUnitChange('lbs')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                settings.unit === 'lbs'
                  ? 'btn-theme-primary shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LBS
            </button>
            <button
              onClick={() => handleUnitChange('kg')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                settings.unit === 'kg'
                  ? 'btn-theme-primary shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KG
            </button>
          </div>
        </div>

        {/* Audio Alert Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[#242638]">
          <div>
            <div className="text-xs font-semibold text-white">Audio Chime</div>
            <p className="text-[11px] text-slate-400">Play chime when rest period concludes</p>
          </div>

          <button
            onClick={handleSoundToggle}
            className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors ${
              settings.soundEnabled ? 'bg-theme-accent justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <div className="bg-[#0f0d1a] w-5 h-5 rounded-full shadow-md transform" />
          </button>
        </div>
      </div>

      {/* Workout Flow & Card Organization */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Workout Flow & Organization</h3>
          <p className="text-xs text-slate-400 mt-0.5">Keep your active workout screen clean and focused.</p>
        </div>

        {/* Auto-collapse completed exercises */}
        <div className="flex items-center justify-between pt-2 border-t border-[#242638] gap-4">
          <div>
            <span className="text-xs font-semibold text-white block">Auto-collapse completed exercises</span>
            <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
              Automatically minimize an exercise card once 3 sets are logged so you can smoothly move to the next exercise. You can always re-open it to log extra sets.
            </span>
          </div>

          <button
            id="settings-auto-collapse-toggle"
            onClick={handleAutoCollapseToggle}
            className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors flex-shrink-0 ${
              settings.autoCollapseCompleted !== false ? 'bg-theme-accent justify-end' : 'bg-slate-700 justify-start'
            }`}
            aria-label="Toggle auto-collapse completed exercises"
          >
            <div className="bg-[#0f0d1a] w-5 h-5 rounded-full shadow-md transform" />
          </button>
        </div>
      </div>

      {/* AI Coaching Configuration */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-theme-accent" />
            <span>Google Gemini AI</span>
          </h3>
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              hasServerKey
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : settings.geminiApiKey
                ? 'badge-theme-accent'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {hasServerKey ? 'Built-in Server Key' : settings.geminiApiKey ? 'Device Key Active' : 'Offline Engine'}
          </span>
        </div>

        {/* Server Key Built-in Banner */}
        {hasServerKey && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-white">Built-in API Key Active for Everyone</div>
              <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                Your backend server is already powered by a built-in Gemini API key—AI critiques and interactive coaching work out of the box!
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 leading-relaxed">
          {hasServerKey
            ? 'You can optionally enter a custom personal key below to override the built-in key for this device only.'
            : 'To make Gemini AI built-in for you and all your friends automatically without entering keys here, configure GEMINI_API_KEY in the app environment variables (Settings → Secrets in AI Studio).'}
        </p>

        <div className="flex gap-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={hasServerKey ? 'Override built-in key (optional)...' : 'AIzaSy...'}
            className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[#191a27] border border-[#282a3d] text-base sm:text-xs text-white placeholder-slate-600 focus:border-theme-accent focus:outline-none font-mono"
          />
          <button
            onClick={handleSaveApiKey}
            className="px-4 py-2.5 rounded-2xl btn-theme-primary text-xs font-bold transition-colors shadow-sm"
          >
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>

        {settings.geminiApiKey && (
          <div className="text-xs text-theme-light flex items-center gap-1.5 pt-0.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Device-specific key stored securely in local browser storage.</span>
          </div>
        )}
      </div>

      {/* Data Backup & Export / Import */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-3">
        <h3 className="text-base font-bold text-white">Data Backup & Portability</h3>

        {importStatus && (
          <div className="p-3 rounded-2xl bg-theme-accent-bg border border-theme-border text-theme-light text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{importStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Export JSON */}
          <button
            onClick={() => exportBackupJSON(workouts, customExercises, settings)}
            className="p-3.5 rounded-2xl bg-[#191a27] hover:bg-[#202234] border border-[#282a3d] hover:border-[#383a52] text-left transition-colors"
          >
            <Download className="w-4 h-4 text-theme-accent mb-1.5" />
            <div className="text-xs font-bold text-white">Export JSON</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {workouts.length} workouts saved
            </div>
          </button>

          {/* Import JSON */}
          <label className="p-3.5 rounded-2xl bg-[#191a27] hover:bg-[#202234] border border-[#282a3d] hover:border-[#383a52] text-left transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-theme-accent mb-1.5" />
            <div className="text-xs font-bold text-white">Import Backup</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Restore data file</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Download Standalone Single-File HTML */}
        <div className="pt-2 border-t border-[#242638]">
          <button
            onClick={downloadStandaloneHTML}
            className="w-full py-3 px-4 rounded-2xl bg-theme-accent-bg hover:opacity-90 border border-theme-border text-theme-light text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <FileCode className="w-4 h-4" />
            <span>Download Standalone HTML App (LogX.html)</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Clear Data */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          <span>Reset & Storage</span>
        </h3>

        {showClearConfirm ? (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-3">
            <p className="text-xs text-rose-300 font-medium">
              Are you sure? This will delete all logged workouts and custom exercises from this
              device.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearAllData();
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold"
              >
                Delete Everything
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Reset Application Data</div>
              <p className="text-[11px] text-slate-400">Clears history and preferences</p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-colors"
            >
              Reset Data
            </button>
          </div>
        )}
      </div>

      {/* App Version Info */}
      <div className="text-center pt-2 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">LogX</p>
      </div>
    </div>
  );
};
