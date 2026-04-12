import React from 'react';
import { useDarkMode } from '../App';

function PrivacyPolicy() {
  const { darkMode } = useDarkMode();

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-4xl mx-auto">
        <div className={`rounded-2xl shadow-lg p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
          <p className={`text-sm mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                FileForge collects the following information to provide and improve our services:
              </p>
              <ul className={`list-disc list-inside mt-2 space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li><strong>Files You Upload:</strong> Temporarily stored for processing, automatically deleted after 7 days</li>
                <li><strong>Usage Data:</strong> File types, operation types, file sizes, processing times</li>
                <li><strong>Optional Account Data:</strong> Email and username (only if you choose to create an account)</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
              <ul className={`list-disc list-inside space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>Process your files according to your requests</li>
                <li>Maintain processing history (optional, requires login)</li>
                <li>Improve our services and user experience</li>
                <li>Monitor system performance and security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Data Storage and Security</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                We take data security seriously:
              </p>
              <ul className={`list-disc list-inside mt-2 space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li><strong>Automatic Deletion:</strong> All processed files are automatically deleted after 7 days</li>
                <li><strong>Encryption:</strong> Files are encrypted during transmission (HTTPS)</li>
                <li><strong>Secure Storage:</strong> Files stored on secure servers with access controls</li>
                <li><strong>No Permanent Storage:</strong> We don't permanently store your files</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Optional Authentication</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                FileForge works without creating an account. Authentication is <strong>optional</strong> and only required if you want to:
              </p>
              <ul className={`list-disc list-inside mt-2 space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>Save your processing history online</li>
                <li>Access your history from multiple devices</li>
                <li>Receive email notifications (if enabled)</li>
              </ul>
              <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Guest users:</strong> Can use all features without login. History is stored locally in your browser only.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Cookies and Local Storage</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                We use browser local storage to:
              </p>
              <ul className={`list-disc list-inside mt-2 space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>Remember your preferences (dark mode, language)</li>
                <li>Store local processing history (guest users)</li>
                <li>Maintain your login session (logged-in users)</li>
              </ul>
              <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                You can clear this data anytime through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Third-Party Services</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                We may use third-party services for:
              </p>
              <ul className={`list-disc list-inside mt-2 space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li><strong>Cloud Storage:</strong> Supabase (for file storage)</li>
                <li><strong>Database:</strong> MongoDB (for user accounts and history)</li>
                <li><strong>Analytics:</strong> Anonymous usage statistics (if enabled)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Your Rights (GDPR Compliance)</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                You have the right to:
              </p>
              <ul className={`list-disc list-inside mt-2 space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li><strong>Access:</strong> Request a copy of your data</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Correction:</strong> Update your account information</li>
                <li><strong>Portability:</strong> Export your processing history</li>
                <li><strong>Objection:</strong> Opt-out of data collection (use guest mode)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Data Retention</h2>
              <ul className={`list-disc list-inside space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li><strong>Uploaded Files:</strong> Deleted after 7 days automatically</li>
                <li><strong>Processing History:</strong> Kept until you delete your account</li>
                <li><strong>Account Data:</strong> Kept until you request deletion</li>
                <li><strong>Logs:</strong> Kept for 30 days for security purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Children's Privacy</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                FileForge is not intended for children under 13. We do not knowingly collect data from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Changes to This Policy</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                We may update this privacy policy from time to time. We will notify users of significant changes via email (for logged-in users) or a notice on our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Contact Us</h2>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                If you have questions about this privacy policy or your data, please contact us at:
              </p>
              <p className={`mt-2 font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Email: privacy@fileforge.com
              </p>
            </section>

            <div className={`mt-8 p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
              <h3 className={`font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                🔒 Your Privacy Matters
              </h3>
              <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                FileForge is designed with privacy in mind. You can use all features without creating an account. 
                Your files are automatically deleted after 7 days. We never sell your data to third parties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
