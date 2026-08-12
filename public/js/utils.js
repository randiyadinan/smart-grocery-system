/**
 * Utility Helpers Module
 */
const Utils = {
  // Format currency in Sri Lankan Rupees (LKR)
  formatCurrency(amount) {
    return 'Rs. ' + Number(amount || 0).toLocaleString('en-LK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  },

  // Format date time string
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' +
           date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  },

  // Show Toast Notification Banner
  showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '🔔';
    if (type === 'success') icon = '🎉';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span style="font-size: 1.3rem;">${icon}</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 0.9rem;">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    Utils.playChimeSound();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Synthesize soft audio notification chime using Web Audio API
  playChimeSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Audio context may be blocked before user interaction
    }
  }
};
