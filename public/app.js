function app() {
  return {
    // Navigation
    currentTab: 'dashboard',
    tabs: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>',
      },
      {
        id: 'products',
        label: 'Products',
        icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>',
      },
      {
        id: 'new-quote',
        label: 'New Quote',
        icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clip-rule="evenodd"/></svg>',
      },
      {
        id: 'history',
        label: 'History',
        icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
      },
      {
        id: 'setup',
        label: 'Setup Guide',
        icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
      },
    ],

    // Data
    products: [],
    quotes: [],
    settings: {},

    // UI state
    toast: null,
    loadingProducts: false,
    productsError: null,
    productSearch: '',
    historySearch: '',
    generatingQuote: false,

    // New quote form
    form: {
      clientName: '',
      clientEmail: '',
      clientCompany: '',
      taxRate: 0,
      notes: '',
      sendEmail: true,
    },
    selectedProductIds: [],
    productQtys: {},

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    async init() {
      await Promise.all([this.loadSettings(), this.loadQuotes()]);
      await this.loadProducts();
    },

    // ── Data loaders ──────────────────────────────────────────────────────────
    async loadSettings() {
      try {
        const res  = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) {
          this.settings  = data.settings;
          this.form.taxRate = data.settings.defaultTaxRate || 0;
        }
      } catch (e) {
        console.error('Settings load failed:', e);
      }
    },

    async loadProducts() {
      this.loadingProducts = true;
      this.productsError   = null;
      try {
        const res  = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
          this.products = data.products;
        } else {
          this.productsError = data.error;
        }
      } catch (e) {
        this.productsError = e.message;
      } finally {
        this.loadingProducts = false;
      }
    },

    async loadQuotes() {
      try {
        const res  = await fetch('/api/quotes');
        const data = await res.json();
        if (data.success) this.quotes = data.quotes;
      } catch (e) {
        console.error('Quotes load failed:', e);
      }
    },

    async refreshProducts() {
      this.loadingProducts = true;
      this.productsError   = null;
      try {
        const res  = await fetch('/api/products/refresh', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          this.products = data.products;
          this.showToast('Products refreshed from Google Sheets');
        } else {
          this.productsError = data.error;
          this.showToast(data.error, 'error');
        }
      } catch (e) {
        this.productsError = e.message;
        this.showToast(e.message, 'error');
      } finally {
        this.loadingProducts = false;
      }
    },

    // ── Quote generation ──────────────────────────────────────────────────────
    async generateQuote() {
      if (!this.form.clientName || !this.form.clientEmail || !this.selectedProductIds.length) {
        this.showToast('Please fill in client details and select at least one product.', 'error');
        return;
      }

      this.generatingQuote = true;
      try {
        const selectedProds = this.products
          .filter((p) => this.selectedProductIds.includes(p.id))
          .map((p) => ({ ...p, quantity: parseInt(this.productQtys[p.id]) || 1 }));

        const body = {
          clientName:    this.form.clientName,
          clientEmail:   this.form.clientEmail,
          clientCompany: this.form.clientCompany,
          products:      selectedProds,
          taxRate:       parseFloat(this.form.taxRate) || 0,
          notes:         this.form.notes,
          sendEmail:     this.form.sendEmail,
        };

        const res  = await fetch('/api/quote', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        // Trigger PDF download
        const bytes  = Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0));
        const blob   = new Blob([bytes], { type: 'application/pdf' });
        const url    = URL.createObjectURL(blob);
        const a      = document.createElement('a');
        a.href       = url;
        a.download   = `quotation-${data.quoteNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        const emailMsg = data.emailSent
          ? ` Email sent to ${this.form.clientEmail}.`
          : this.form.sendEmail
            ? ' (Email failed – check SMTP settings.)'
            : '';

        this.showToast(`Quotation ${data.quoteNumber} generated!${emailMsg}`);

        // Reload history
        await this.loadQuotes();

        // Reset form
        this.form = {
          clientName: '',
          clientEmail: '',
          clientCompany: '',
          taxRate: this.settings.defaultTaxRate || 0,
          notes: '',
          sendEmail: true,
        };
        this.selectedProductIds = [];
        this.productQtys = {};
      } catch (e) {
        this.showToast(e.message, 'error');
      } finally {
        this.generatingQuote = false;
      }
    },

    async resendEmail(q) {
      q._sending = true;
      try {
        const res  = await fetch(`/api/quotes/${q.id}/email`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          q.emailSent = true;
          this.showToast(`Email resent to ${q.clientEmail}`);
        } else {
          this.showToast(data.error, 'error');
        }
      } catch (e) {
        this.showToast(e.message, 'error');
      } finally {
        q._sending = false;
      }
    },

    async deleteQuote(q) {
      if (!confirm(`Delete quotation ${q.quoteNumber}?`)) return;
      try {
        const res  = await fetch(`/api/quotes/${q.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          this.quotes = this.quotes.filter((x) => x.id !== q.id);
          this.showToast('Quotation deleted');
        } else {
          this.showToast(data.error, 'error');
        }
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    // ── Product helpers ───────────────────────────────────────────────────────
    selectAllProducts() {
      this.selectedProductIds = this.products.map((p) => p.id);
    },

    deselectAllProducts() {
      this.selectedProductIds = [];
    },

    getQty(id) {
      return this.productQtys[id] || 1;
    },

    setQty(id, val) {
      this.productQtys[id] = Math.max(1, parseInt(val) || 1);
    },

    // ── Computed ──────────────────────────────────────────────────────────────
    get filteredProducts() {
      const q = this.productSearch.toLowerCase();
      if (!q) return this.products;
      return this.products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    },

    get filteredQuotes() {
      const q = this.historySearch.toLowerCase();
      if (!q) return this.quotes;
      return this.quotes.filter(
        (x) =>
          x.clientName.toLowerCase().includes(q) ||
          x.quoteNumber.toLowerCase().includes(q) ||
          x.clientEmail.toLowerCase().includes(q)
      );
    },

    get selectedItems() {
      return this.products
        .filter((p) => this.selectedProductIds.includes(p.id))
        .map((p) => ({ ...p, qty: parseInt(this.productQtys[p.id]) || 1 }));
    },

    get quoteSubtotal() {
      return this.selectedItems.reduce((s, p) => s + p.sellingPrice * p.qty, 0);
    },

    get quoteTotal() {
      const tax = this.quoteSubtotal * (parseFloat(this.form.taxRate) || 0) / 100;
      return this.quoteSubtotal + tax;
    },

    // ── Formatters ────────────────────────────────────────────────────────────
    fmtMoney(n) {
      const sym = this.settings.currencySymbol || '$';
      return `${sym}${Number(n || 0).toFixed(2)}`;
    },

    fmtDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    },

    calcTotal(q) {
      const sub = (q.products || []).reduce(
        (s, p) => s + Number(p.sellingPrice ?? p.price) * (p.quantity || 1),
        0
      );
      const tax = sub * (parseFloat(q.taxRate) || 0) / 100;
      return sub + tax;
    },

    margin(p) {
      if (!p.sellingPrice) return 0;
      return ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100;
    },

    // ── Toast ─────────────────────────────────────────────────────────────────
    showToast(msg, type = 'success') {
      this.toast = { msg, type };
      setTimeout(() => { this.toast = null; }, 4000);
    },
  };
}
