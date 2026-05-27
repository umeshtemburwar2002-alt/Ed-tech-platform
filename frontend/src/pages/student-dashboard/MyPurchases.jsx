import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { CreditCard, Calendar, Receipt, Download, AlertCircle, ShoppingBag } from 'lucide-react';
import { GlassCard, Badge, Avatar, EmptyState, Modal } from '../../components/dashboard/Common';
import { GetPaymentHistory } from '../../services/operations/studentFeaturesAPI';
import { toast } from 'react-hot-toast';

const MyPurchases = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        if (token) {
          const data = await GetPaymentHistory(token);
          setPayments(data);
        }
      } catch (err) {
        console.error("Failed to load purchase history:", err);
        toast.error("Could not load payment history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  // Format date
  const formatDate = (dateStr) => {
    const opt = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString('en-IN', opt);
  };

  // Calculations for Stat summary
  const totalSpent = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const successfulPurchasesCount = payments.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-white select-none">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <CreditCard className="text-indigo-400 w-7 h-7" /> My Purchases
          </h1>
          <p className="text-gray-500 text-xs mt-1">View payment history, invoices, and transaction logs</p>
        </div>
      </div>

      {/* STAT SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none">Total Courses</h3>
            <p className="text-2xl font-black mt-1.5 leading-none">{successfulPurchasesCount}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="text-lg font-black">₹</span>
          </div>
          <div>
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none">Total Spent</h3>
            <p className="text-2xl font-black mt-1.5 leading-none">₹{totalSpent.toLocaleString('en-IN')}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none">Invoices Issued</h3>
            <p className="text-2xl font-black mt-1.5 leading-none">{successfulPurchasesCount}</p>
          </div>
        </GlassCard>
      </div>

      {/* PURCHASES LIST */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Transaction History Log</h2>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading invoice data...</p>
          </div>
        ) : payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map((p) => {
              const courseTitle = p.course?.title || "Enrolled Course";
              const courseThumb = p.course?.thumbnail || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&h=120&fit=crop";

              return (
                <GlassCard key={p.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-white/20 transition-all">
                  
                  {/* Course info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <img 
                      src={courseThumb} 
                      alt="" 
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10" 
                    />
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-white truncate max-w-md">{courseTitle}</h4>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5 text-gray-600" />
                        <span>{formatDate(p.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="flex items-center justify-between lg:justify-end gap-8 shrink-0">
                    
                    {/* Amount */}
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Amount Paid</p>
                      <p className="text-base font-black text-white mt-1.5 leading-none">₹{p.amount.toLocaleString('en-IN')}</p>
                    </div>

                    {/* Status Badge */}
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">Status</p>
                      <Badge text="SUCCESS" color="emerald" />
                    </div>

                    {/* View Invoice button */}
                    <button
                      onClick={() => setSelectedPayment(p)}
                      className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-black uppercase rounded-xl tracking-wider transition-all flex items-center gap-2"
                    >
                      <Receipt className="w-3.5 h-3.5" /> Invoice
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <EmptyState 
            icon={Receipt} 
            title="No transaction logs" 
            subtitle="You haven't made any course purchases yet. Explore our course catalog to get started!" 
            ctaText="Browse Courses"
            onCta={() => window.location.href = "/course-catalog"} 
          />
        )}
      </div>

      {/* PRINTABLE INVOICE MODAL */}
      <Modal open={!!selectedPayment} onClose={() => setSelectedPayment(null)}>
        {selectedPayment && (
          <div className="p-8 text-white relative select-text" id="printable-invoice">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <CreditCard className="text-indigo-400" /> TAX INVOICE
                </h2>
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">EdTech Learning Hub Private Ltd.</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg font-bold tracking-wider">
                  ORIGINAL FOR RECIPIENT
                </span>
              </div>
            </div>

            {/* Bill Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mb-8">
              <div className="space-y-1">
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">BILLED TO:</p>
                <p className="font-black text-sm text-white">{user?.firstName || ""} {user?.lastName || ""}</p>
                <p className="text-gray-400">{user?.email || ""}</p>
                <p className="text-gray-500 text-[10px] uppercase font-bold">Student Account</p>
              </div>
              <div className="space-y-1 text-left md:text-right">
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">INVOICE METADATA:</p>
                <p className="text-gray-400">
                  <strong className="text-white">Receipt ID:</strong> {selectedPayment.razorpay_payment_id || selectedPayment.id.substr(0, 12)}
                </p>
                <p className="text-gray-400">
                  <strong className="text-white">Order ID:</strong> {selectedPayment.razorpay_order_id}
                </p>
                <p className="text-gray-400">
                  <strong className="text-white">Date:</strong> {formatDate(selectedPayment.created_at)}
                </p>
                <p className="text-gray-400">
                  <strong className="text-white">Payment Method:</strong> Razorpay Standard Checkout
                </p>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="border border-white/10 rounded-2xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 font-bold text-gray-400">
                    <th className="p-4 uppercase tracking-wider">Item Description</th>
                    <th className="p-4 uppercase tracking-wider text-right">Base Price (INR)</th>
                    <th className="p-4 uppercase tracking-wider text-right">Tax (GST 18%)</th>
                    <th className="p-4 uppercase tracking-wider text-right">Total Price (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  <tr>
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{selectedPayment.course?.title || "Enrolled Course"}</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tight">Access Period: Lifetime Validity</p>
                    </td>
                    <td className="p-4 text-right">
                      ₹{Math.round(selectedPayment.amount * 0.82).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right">
                      ₹{Math.round(selectedPayment.amount * 0.18).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right font-black text-white">
                      ₹{selectedPayment.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Block */}
            <div className="flex justify-end mb-8">
              <div className="w-72 space-y-2.5 text-xs text-gray-400 border-t border-white/10 pt-4">
                <div className="flex justify-between">
                  <span>Subtotal (Net Base):</span>
                  <span className="text-white font-bold">₹{Math.round(selectedPayment.amount * 0.82).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Integrated GST (18%):</span>
                  <span className="text-white font-bold">₹{Math.round(selectedPayment.amount * 0.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm text-white font-black border-t border-white/5 pt-2.5">
                  <span>Grand Total Paid:</span>
                  <span className="text-indigo-400">₹{selectedPayment.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Invoice Footer */}
            <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-[10px] text-gray-500 text-center md:text-left leading-relaxed">
                This is a system-generated electronic tax invoice and does not require a physical signature.<br />
                For any receipt inquiries, please raise a support ticket at our help center.
              </p>
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const printContents = document.getElementById("printable-invoice").innerHTML;
                    const originalContents = document.body.innerHTML;
                    
                    // Open a clean print window
                    const printWindow = window.open("", "_blank");
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Tax Invoice - ${selectedPayment.razorpay_payment_id || selectedPayment.id}</title>
                          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                          <style>
                            body { background-color: #0b0f19; color: #ffffff; padding: 40px; font-family: sans-serif; }
                            .border-white\\/10 { border-color: rgba(255,255,255,0.1); }
                            .bg-white\\/5 { background-color: rgba(255,255,255,0.05); }
                            .text-indigo-400 { color: #818cf8; }
                          </style>
                        </head>
                        <body>
                          <div class="max-w-4xl mx-auto">${printContents}</div>
                          <script>
                            // Hide the action button panel during print
                            document.querySelector(".actions-panel")?.remove();
                            window.onload = function() { window.print(); window.close(); }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 border border-indigo-500/30 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Print Invoice
                </button>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default MyPurchases;
