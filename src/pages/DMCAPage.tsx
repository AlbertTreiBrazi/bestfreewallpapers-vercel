import React from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { AlertTriangle, Mail, FileText, Clock, CheckCircle } from 'lucide-react'

export function DMCAPage() {
  const seoConfig = {
    title: 'DMCA Policy - BestFreeWallpapers',
    description: 'Digital Millennium Copyright Act (DMCA) policy for BestFreeWallpapers. Learn how to report copyright infringement and our takedown procedures.',
    keywords: ['DMCA', 'copyright', 'takedown', 'infringement', 'intellectual property']
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead config={seoConfig} />
      
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-gray-200" />
            <h1 className="text-4xl font-bold mb-4">DMCA Policy</h1>
            <p className="text-xl text-gray-100">
              Digital Millennium Copyright Act compliance and takedown procedures.
            </p>
            <p className="text-gray-200 mt-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* Copyright Respect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
              Our Commitment to Copyright
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              BestFreeWallpapers respects the intellectual property rights of others and expects our users to do the same. It is our policy to respond to clear notices of alleged copyright infringement that comply with the Digital Millennium Copyright Act (DMCA).
            </p>
            <p className="text-gray-700 leading-relaxed">
              We are committed to protecting the rights of copyright holders while providing a valuable service to our users. All wallpapers on our platform are carefully vetted to ensure they are legally available for distribution.
            </p>
          </section>

          {/* Filing a DMCA Notice */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-gray-600" />
              Filing a DMCA Takedown Notice
            </h2>
            <p className="text-gray-700 mb-4">
              If you believe that your copyrighted work has been used on our website in a way that constitutes copyright infringement, please provide our DMCA agent with a written notice containing the following information:
            </p>
            
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-800">Required Information:</h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-3">
                <li><strong>Identification of the copyrighted work:</strong> Describe the copyrighted work that you claim has been infringed, or provide a representative list if multiple works are involved.</li>
                
                <li><strong>Identification of the infringing material:</strong> Provide the URL(s) or other specific location information where the allegedly infringing material is located on our website.</li>
                
                <li><strong>Contact information:</strong> Include your name, mailing address, telephone number, and email address.</li>
                
                <li><strong>Good faith statement:</strong> Include a statement that you have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.</li>
                
                <li><strong>Accuracy statement:</strong> Include a statement that the information in the notification is accurate and, under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
                
                <li><strong>Signature:</strong> Provide a physical or electronic signature of the copyright owner or person authorized to act on their behalf.</li>
              </ol>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Mail className="w-6 h-6 mr-3 text-gray-600" />
              DMCA Agent Contact Information
            </h2>
            <p className="text-gray-700 mb-4">
              Please send your DMCA takedown notice to our designated agent:
            </p>
            
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">DMCA Agent</h3>
              <div className="text-blue-800 space-y-1">
                <p><strong>Email:</strong> dmca@bestfreewallpapers.com</p>
                <p><strong>Subject Line:</strong> DMCA Takedown Request</p>
                <p><strong>Response Time:</strong> We aim to respond within 24-48 hours</p>
              </div>
            </div>
          </section>

          {/* Our Process */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Clock className="w-6 h-6 mr-3 text-gray-600" />
              Our DMCA Process
            </h2>
            <p className="text-gray-700 mb-4">When we receive a valid DMCA notice, we follow this process:</p>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 text-gray-600 rounded-full p-2 text-sm font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-gray-800">Review</h3>
                  <p className="text-gray-700 text-sm">We review the notice to ensure it meets DMCA requirements.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 text-gray-600 rounded-full p-2 text-sm font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-gray-800">Action</h3>
                  <p className="text-gray-700 text-sm">If valid, we promptly remove or disable access to the allegedly infringing material.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 text-gray-600 rounded-full p-2 text-sm font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-gray-800">Notification</h3>
                  <p className="text-gray-700 text-sm">We notify the person who posted the material about the removal.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 text-gray-600 rounded-full p-2 text-sm font-bold">4</div>
                <div>
                  <h3 className="font-semibold text-gray-800">Documentation</h3>
                  <p className="text-gray-700 text-sm">We maintain records of all DMCA notices and actions taken.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Counter-Notification */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Counter-Notification Process</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you believe that your material was removed or disabled by mistake or misidentification, you may submit a counter-notification. The counter-notification must include:
            </p>
            
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Your physical or electronic signature</li>
              <li>Identification of the material and its location before removal</li>
              <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake</li>
              <li>Your name, address, phone number, and consent to federal court jurisdiction</li>
            </ul>
          </section>

          {/* False Claims Warning */}
          <section className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-yellow-800 mb-3 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Important Warning
            </h2>
            <p className="text-yellow-800 leading-relaxed">
              Please note that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing may be subject to liability. Don't make false claims - there can be legal consequences.
            </p>
          </section>

          {/* Contact for Questions */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions?</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about our DMCA policy or need assistance with the takedown process, please contact us:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-800 font-medium">General Support: support@bestfreewallpapers.com</p>
              <p className="text-gray-800">DMCA Specific: dmca@bestfreewallpapers.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default DMCAPage
