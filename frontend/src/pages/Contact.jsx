import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { submitGuestContact } from '../services/operations/supportAPI';
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Contact = () => {
  // Simulating user states - in real app, these come from Redux or Auth Context
  const { user } = useSelector((state) => state.profile);
  const isLoggedIn = !!user;
  const userRole = user?.accountType?.toLowerCase() || 'guest'; // 'student', 'instructor' (teacher), or 'guest'

  const [formData, setFormData] = useState({
    name: user?.firstName ? `${user.firstName} ${user.lastName}` : '',
    email: user?.email || '',
    subject: '',
    issueType: '',
    course: '',
    message: '',
    priority: 'Low',
    file: null
  });

  const [tickets, setTickets] = useState([
    { id: '#12345', subject: 'Payment Issue', status: 'Resolved', date: '2024-03-20' },
    { id: '#12348', subject: 'Course Access', status: 'Pending', date: '2024-03-24' },
  ]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Use the real backend endpoint for everyone submitting the public contact form
    const result = await submitGuestContact({
      name:    formData.name,
      email:   formData.email,
      subject: formData.subject,
      message: formData.message,
    });
    if (result.success) {
      setTicketId(result.ticketId ? `#${String(result.ticketId).slice(0, 8).toUpperCase()}` : '');
      setIsSubmitted(true);
      setFormData({ ...formData, name: '', email: '', subject: '', message: '' });
      setTimeout(() => setIsSubmitted(false), 5000);
    }
  };

  const renderGuestForm = () => (
    <div className="grid lg:grid-cols-2 gap-12">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">Get in Touch</h2>
          <p className="text-slate-400 mb-8 text-lg">Have a question? We're here to help you on your learning journey.</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-white/5 text-blue-400 border border-white/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-envelope text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Email Us</p>
              <p className="text-white font-bold">edutechplatform3@gmail.com</p>
            </div>
          </div>

          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-white/5 text-blue-400 border border-white/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-phone-alt text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Call Us</p>
              <p className="text-white font-bold">+91 8856087984</p>
            </div>
          </div>

          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-white/5 text-blue-400 border border-white/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-map-marker-alt text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Our Office</p>
              <p className="text-white font-bold leading-relaxed">M.B.E. Society's College of Engineering, Ambajogai, Maharashtra 431517</p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Follow Us</p>
          <div className="flex gap-4">
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 text-slate-400 border border-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300">
              <Linkedin size={24} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 text-slate-400 border border-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300">
              <Instagram size={24} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 text-slate-400 border border-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300">
              <Twitter size={24} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 text-slate-400 border border-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300">
              <Facebook size={24} />
            </a>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-dark p-8 md:p-10 rounded-[2rem] border border-white/5">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-blue-500/50 transition-all" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-blue-500/50 transition-all" placeholder="john@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Subject</label>
            <select name="subject" required value={formData.subject} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#000814] text-white focus:outline-none focus:border-blue-500/50 transition-all">
              <option value="">Select a query type</option>
              <option value="General Query">General Query</option>
              <option value="Course Info">Course Info</option>
              <option value="Fees">Fees</option>
              <option value="Technical Issue">Technical Issue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Message</label>
            <textarea name="message" required rows="4" value={formData.message} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-blue-500/50 transition-all" placeholder="How can we help you?"></textarea>
          </div>
          <button type="submit" className="w-full btn-primary py-4 text-lg">Send Message</button>
        </form>
      </motion.div>

      {/* Google Map Embed */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true }}
        className="lg:col-span-2 mt-8 overflow-hidden rounded-[2rem] shadow-xl border border-white/10 h-[300px]"
      >
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3774.460833215682!2d76.37001461081596!3d18.722158799999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc55e7a4a1f5c6b%3A0x1a6039b017e94977!2sM.B.E.%20Society&#39;s%20College%20of%20Engineering%2C%20Ambajogai!5e0!3m2!1sen!2sin!4v1711365000000!5m2!1sen!2sin" 
          width="100%" 
          height="100%" 
          style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} 
          allowFullScreen="" 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
          title="M.B.E. Society's College of Engineering"
        ></iframe>
      </motion.div>
    </div>
  );

  const renderStudentTeacherForm = (role) => (
    <div className="grid lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 md:p-10 rounded-[2rem]">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <i className="fas fa-headset text-blue-600"></i>
            {role === 'student' ? 'Student Support System' : 'Instructor Support Dashboard'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
                <input type="text" readOnly value={formData.name} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input type="email" readOnly value={formData.email} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Issue Type</label>
                <select name="issueType" required value={formData.issueType} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                  <option value="">Select issue type</option>
                  {role === 'student' ? (
                    <>
                      <option value="Course Issue">Course Issue</option>
                      <option value="Payment Issue">Payment Issue</option>
                      <option value="Login Problem">Login Problem</option>
                      <option value="Technical Bug">Technical Bug</option>
                    </>
                  ) : (
                    <>
                      <option value="Course Upload Issue">Course Upload Issue</option>
                      <option value="Student Management">Student Management Issue</option>
                      <option value="Payment/Payout">Payment/Payout Issue</option>
                      <option value="Technical Bug">Technical Bug</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Course</label>
                <select name="course" required value={formData.course} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                  <option value="">Choose course</option>
                  <option value="Python Beginners">Python for Beginners</option>
                  <option value="Web Dev">Full Stack Web Development</option>
                  <option value="UI/UX">UI/UX Design Masterclass</option>
                </select>
              </div>
            </div>

            {role === 'instructor' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Priority Level</label>
                <div className="flex gap-4">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`flex-1 py-3 rounded-xl border font-bold transition-all duration-300 ${formData.priority === p ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Describe the Issue</label>
              <textarea name="message" required rows="4" value={formData.message} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Please provide as much detail as possible..."></textarea>
            </div>

            <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-blue-400 transition-all cursor-pointer group">
              <input type="file" className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <i className="fas fa-cloud-upload-alt text-3xl text-slate-300 group-hover:text-blue-500 mb-2 transition-all"></i>
                <p className="text-slate-500 font-medium">Click to upload screenshot (Optional)</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
              </label>
            </div>

            <button type="submit" className="w-full btn-primary py-4 text-lg">Submit Ticket</button>
          </form>
        </motion.div>
      </div>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-8 rounded-[2rem]">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">
            My Tickets
            <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full">{tickets.length} Active</span>
          </h3>
          <div className="space-y-4">
            {tickets.map((ticket, idx) => (
              <div key={idx} className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-slate-900">{ticket.id}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${ticket.status === 'Resolved' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2 font-medium">{ticket.subject}</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <i className="far fa-calendar"></i> {ticket.date}
                </p>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all">View All History</button>
        </motion.div>

        {role === 'instructor' && (
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center gap-4 hover:bg-slate-800 transition-all shadow-xl group">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-all">
              <i className="fas fa-comments"></i>
            </div>
            <div className="text-left">
              <p className="font-bold">Live Chat Support</p>
              <p className="text-xs text-slate-400">Available 10 AM - 6 PM</p>
            </div>
          </motion.button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-28 pb-20 bg-[#000814] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <AnimatePresence>
          {isSubmitted && (
            <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] glass-dark border-green-500/50 p-6 rounded-2xl flex items-center gap-4 shadow-2xl backdrop-blur-xl">
              <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center text-xl">
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <p className="font-bold text-white">Message Sent Successfully!</p>
                {isLoggedIn && <p className="text-sm text-slate-400">Your Ticket ID is <span className="font-bold text-blue-400">{ticketId}</span></p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mb-16">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-4">How can we help?</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-slate-400 max-w-2xl mx-auto">
            We are here to answer any questions you may have. Reach out to us and we will respond as soon as we can.
          </motion.p>
        </div>

        {renderGuestForm()}

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-24">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { q: "How do I enroll in a course?", a: "Simply browse our catalog, click on a course you like, and hit the 'Enroll Now' button. You'll be guided through the payment process." },
              { q: "Can I access courses offline?", a: "Yes! Our mobile app allows you to download lessons and watch them anytime, even without an internet connection." },
              { q: "Is there a refund policy?", a: "We offer a 30-day money-back guarantee for all our premium courses if you're not satisfied with the content." },
              { q: "Do I get a certificate?", a: "Every premium course on our platform comes with a verified certificate of completion that you can share on LinkedIn." }
            ].map((faq, idx) => (
              <div key={idx} className="glass-dark p-8 rounded-3xl hover:shadow-lg transition-all duration-300 border border-white/5">
                <h3 className="font-bold text-white mb-3 flex items-start gap-3">
                  <span className="text-blue-400 font-black">Q.</span> {faq.q}
                </h3>
                <p className="text-slate-400 leading-relaxed pl-7">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Contact;
