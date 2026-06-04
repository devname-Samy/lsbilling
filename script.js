/**
 * Lifestoning Pvt Ltd — Billing & Engine Layer Architecture
 * Vanilla JavaScript Front-End Model Implementation
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Application Constants ---
    const CATEGORIES = [
        "Rolling Papers", "Perfect Rolls", "Combo", "Lighters", 
        "Apparels", "Bags", "Caps", "Bongs", "Trays", "Accessories"
    ];

    // --- State Storage Registry ---
    let state = {
        invoiceNumber: "LS-2026-0001",
        items: [],
        customer: { name: "", shop: "", mobile: "", gst: "", address: "" },
        meta: { date: "", due: "", method: "UPI", status: "Paid", notes: "" },
        geo: { latitude: "", longitude: "", accuracy: "" }
    };

    let billingCsvHandle = null;
    const BILLING_CSV_FILENAME = 'billing.csv';

    // --- DOM Elements Cache Hook ---
    const elements = {
        themeToggle: document.getElementById('theme-toggle'),
        itemsTbody: document.getElementById('items-tbody'),
        btnAddItem: document.getElementById('btn-add-item'),
        lblItemsTbody: document.getElementById('lbl-items-tbody'),
        // Controls inputs
        custName: document.getElementById('cust-name'),
        custShop: document.getElementById('cust-shop'),
        custMobile: document.getElementById('cust-mobile'),
        custGst: document.getElementById('cust-gst'),
        custAddress: document.getElementById('cust-address'),
        invDate: document.getElementById('inv-date'),
        invDue: document.getElementById('inv-due'),
        payMethod: document.getElementById('pay-method'),
        payStatus: document.getElementById('pay-status'),
        invoiceNotes: document.getElementById('invoice-notes'),
        // Interface Output Labels
        lblInvId: document.getElementById('lbl-inv-id'),
        lblInvDate: document.getElementById('lbl-inv-date'),
        lblInvDue: document.getElementById('lbl-inv-due'),
        lblCustName: document.getElementById('lbl-cust-name'),
        lblCustShop: document.getElementById('lbl-cust-shop'),
        lblCustAddress: document.getElementById('lbl-cust-address'),
        lblCustMobile: document.getElementById('lbl-cust-mobile'),
        lblCustGst: document.getElementById('lbl-cust-gst'),
        lblCustGstWrap: document.getElementById('lbl-cust-gst-wrap'),
        lblPayMethod: document.getElementById('lbl-pay-method'),
        lblPayStatus: document.getElementById('lbl-pay-status'),
        lblNotes: document.getElementById('lbl-notes'),
        // Financial Aggregations Labels
        lblSubtotal: document.getElementById('lbl-subtotal'),
        lblDiscount: document.getElementById('lbl-discount'),
        lblCgst: document.getElementById('lbl-cgst'),
        lblSgst: document.getElementById('lbl-sgst'),
        lblRoundoff: document.getElementById('lbl-roundoff'),
        lblGrandtotal: document.getElementById('lbl-grandtotal'),
        // Actions Trigger Bindings
        btnDownload: document.getElementById('btn-download'),
        btnPrint: document.getElementById('btn-print'),
        btnReset: document.getElementById('btn-reset'),
        btnShare: document.getElementById('btn-share'),
        btnCsv: document.getElementById('btn-csv')
    };

    // --- Initialization Module ---
    function init() {
        initTheme();
        initDates();
        loadInvoiceCounter();
        loadSavedDraft();
        fetchGeolocation();
        registerEventHandlers();
        
        if (state.items.length === 0) {
            addItemRow(); // Inject initial visual placeholder dynamic input row
        } else {
            renderAllItemRows();
        }
        
        calculateTotals();
    }

    // --- Core Subordinate Setup Methods ---
    function initTheme() {
        const activeTheme = localStorage.getItem('ls-theme') || 'light';
        document.documentElement.setAttribute('data-theme', activeTheme);
        updateThemeButtonUI(activeTheme);
    }

    function initDates() {
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1;
        let dd = today.getDate();

        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;

        const dynamicTodayStr = `${yyyy}-${mm}-${dd}`;
        elements.invDate.value = dynamicTodayStr;
        state.meta.date = dynamicTodayStr;

        // Set due date to 15 days later standard default
        const extendedDate = new Date();
        extendedDate.setDate(today.getDate() + 15);
        let edd = extendedDate.getDate();
        let emm = extendedDate.getMonth() + 1;
        if (edd < 10) edd = '0' + edd;
        if (emm < 10) emm = '0' + emm;
        
        const dynamicDueStr = `${extendedDate.getFullYear()}-${emm}-${edd}`;
        elements.invDue.value = dynamicDueStr;
        state.meta.due = dynamicDueStr;
    }

    function loadInvoiceCounter() {
        let currentCounter = localStorage.getItem('ls-invoice-counter');
        if (!currentCounter) {
            currentCounter = 1;
            localStorage.setItem('ls-invoice-counter', currentCounter);
        }
        const paddedNum = String(currentCounter).padStart(4, '0');
        state.invoiceNumber = `LS-2026-${paddedNum}`;
        elements.lblInvId.textContent = state.invoiceNumber;
    }

    function incrementInvoiceCounter() {
        let currentCounter = parseInt(localStorage.getItem('ls-invoice-counter')) || 1;
        localStorage.setItem('ls-invoice-counter', currentCounter + 1);
    }

    // --- Dynamic Input Row Generation ---
    function addItemRow(data = null) {
        const rowId = 'row-' + Date.now() + '-' + Math.floor(Math.random() * 100);
        
        const defaultItem = {
            id: rowId,
            name: data ? data.name : '',
            category: data ? data.category : CATEGORIES[0],
            quantity: data ? data.quantity : 1,
            price: data ? data.price : 0,
            discount: data ? data.discount : 0,
            gst: data ? data.gst : 18 // Default dynamic structural profile item standard GST rate
        };

        state.items.push(defaultItem);

        const tr = document.createElement('tr');
        tr.id = rowId;
        
        // Generate options inside the row view framework mapping
        let categoryOptions = '';
        CATEGORIES.forEach(cat => {
            categoryOptions += `<option value="${cat}" ${defaultItem.category === cat ? 'selected' : ''}>${cat}</option>`;
        });

        tr.innerHTML = `
            <td><input type="text" class="item-name" value="${defaultItem.name}" placeholder="e.g., King Size Brown" required></td>
            <td><select class="item-category">${categoryOptions}</select></td>
            <td><input type="number" class="item-qty" value="${defaultItem.quantity}" min="1" step="1"></td>
            <td><input type="number" class="item-price" value="${defaultItem.price}" min="0" step="0.01"></td>
            <td><input type="number" class="item-disc" value="${defaultItem.discount}" min="0" max="100" step="1"></td>
            <td><input type="number" class="item-gst" value="${defaultItem.gst}" min="0" max="50" step="1"></td>
            <td class="item-row-total" style="font-weight:600; padding-left: 8px;">₹0.00</td>
            <td><button class="btn-sm btn-danger btn-row-delete"><i class="fa-solid fa-trash"></i></button></td>
        `;

        elements.itemsTbody.appendChild(tr);
        bindRowEvents(tr, defaultItem);
        calculateTotals();
        autoSaveDraft();
    }

    function renderAllItemRows() {
        elements.itemsTbody.innerHTML = '';
        const itemsToRender = [...state.items];
        state.items = [];
        itemsToRender.forEach(item => addItemRow(item));
    }

    function bindRowEvents(rowElement, itemObj) {
        const inputs = {
            name: rowElement.querySelector('.item-name'),
            category: rowElement.querySelector('.item-category'),
            qty: rowElement.querySelector('.item-qty'),
            price: rowElement.querySelector('.item-price'),
            disc: rowElement.querySelector('.item-disc'),
            gst: rowElement.querySelector('.item-gst'),
            btnDelete: rowElement.querySelector('.btn-row-delete')
        };

        const updateItemState = () => {
            itemObj.name = inputs.name.value;
            itemObj.category = inputs.category.value;
            itemObj.quantity = parseInt(inputs.qty.value) || 0;
            itemObj.price = parseFloat(inputs.price.value) || 0;
            itemObj.discount = parseFloat(inputs.disc.value) || 0;
            itemObj.gst = parseFloat(inputs.gst.value) || 0;
            
            calculateTotals();
            autoSaveDraft();
        };

        // Listen for input modifications across all components
        inputs.name.addEventListener('input', updateItemState);
        inputs.category.addEventListener('change', updateItemState);
        inputs.qty.addEventListener('input', updateItemState);
        inputs.price.addEventListener('input', updateItemState);
        inputs.disc.addEventListener('input', updateItemState);
        inputs.gst.addEventListener('input', updateItemState);

        inputs.btnDelete.addEventListener('click', () => {
            state.items = state.items.filter(i => i.id !== itemObj.id);
            rowElement.remove();
            calculateTotals();
            autoSaveDraft();
            showToast("Line item removed.");
        });
    }

    // --- Dynamic Aggregations & Calculations Mathematical Model Engine ---
    function calculateTotals() {
        let subtotalAccumulator = 0;
        let discountAccumulator = 0;
        let taxAccumulator = 0;

        // Clear view table rows loop
        elements.lblItemsTbody.innerHTML = '';

        state.items.forEach((item, index) => {
            const rowBaseValue = item.quantity * item.price;
            const absoluteRowDiscount = rowBaseValue * (item.discount / 100);
            const rowTaxableValue = rowBaseValue - absoluteRowDiscount;
            const absoluteRowTax = rowTaxableValue * (item.gst / 100);
            const finalRowTotal = rowTaxableValue + absoluteRowTax;

            subtotalAccumulator += rowBaseValue;
            discountAccumulator += absoluteRowDiscount;
            taxAccumulator += absoluteRowTax;

            // Reflect individual evaluation metric inside source form view matrix
            const rowElement = document.getElementById(item.id);
            if (rowElement) {
                rowElement.querySelector('.item-row-total').textContent = `₹${finalRowTotal.toFixed(2)}`;
            }

            // Append onto Live A4 Print Template Block
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td><strong>${item.name || 'Unnamed Product'}</strong></td>
                <td>${item.category}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">₹${item.price.toFixed(2)}</td>
                <td class="text-center">${item.discount}%</td>
                <td class="text-center">${item.gst}%</td>
                <td class="text-right">₹${finalRowTotal.toFixed(2)}</td>
            `;
            elements.lblItemsTbody.appendChild(tr);
        });

        const grossTaxableAmount = subtotalAccumulator - discountAccumulator;
        const mathematicallyExactGrandTotal = grossTaxableAmount + taxAccumulator;
        
        // Compute accounting rounding offset
        const nearestIntegerGrandTotal = Math.round(mathematicallyExactGrandTotal);
        const roundingOffset = nearestIntegerGrandTotal - mathematicallyExactGrandTotal;

        // Update Global Layout Bindings Metrics
        elements.lblSubtotal.textContent = `₹${subtotalAccumulator.toFixed(2)}`;
        elements.lblDiscount.textContent = `₹${discountAccumulator.toFixed(2)}`;
        elements.lblCgst.textContent = `₹${(taxAccumulator / 2).toFixed(2)}`;
        elements.lblSgst.textContent = `₹${(taxAccumulator / 2).toFixed(2)}`;
        elements.lblRoundoff.textContent = `₹${roundingOffset.toFixed(2)}`;
        elements.lblGrandtotal.textContent = `₹${nearestIntegerGrandTotal.toFixed(2)}`;

        // Sync metadata fields text wrappers
        updateStaticPreviewFields();
    }

    function updateStaticPreviewFields() {
        elements.lblInvDate.textContent = formatDate(elements.invDate.value);
        elements.lblInvDue.textContent = formatDate(elements.invDue.value);
        
        elements.lblCustName.textContent = elements.custName.value || "Customer Name Required";
        elements.lblCustShop.textContent = elements.custShop.value || "";
        elements.lblCustMobile.textContent = elements.custMobile.value || "-";
        elements.lblCustAddress.textContent = elements.custAddress.value || "No address provided.";
        
        if (elements.custGst.value.trim() !== "") {
            elements.lblCustGst.textContent = elements.custGst.value.toUpperCase();
            elements.lblCustGstWrap.style.display = "block";
        } else {
            elements.lblCustGstWrap.style.display = "none";
        }

        elements.lblPayMethod.textContent = elements.payMethod.value;
        elements.lblPayStatus.textContent = elements.payStatus.value;
        
        // Dynamically style status badge based on state
        elements.lblPayStatus.className = "badge";
        if (elements.payStatus.value === 'Paid') {
            elements.lblPayStatus.classList.add('badge-paid');
        } else if (elements.payStatus.value === 'Pending') {
            elements.lblPayStatus.classList.add('badge-pending');
        } else if (elements.payStatus.value === 'Partial') {
            elements.lblPayStatus.classList.add('badge-partial');
        }
    }

    // --- Core Master Validation Module ---
    function validateFormStructure() {
        if (!elements.custName.value.trim()) {
            showToast("Validation Error: Customer Name is an absolute required metric.", "error");
            elements.custName.focus();
            return false;
        }
        if (!elements.custMobile.value.trim()) {
            showToast("Validation Error: Valid Customer Mobile Contact is required.", "error");
            elements.custMobile.focus();
            return false;
        }
        
        const mobilePattern = /^[6-9]\d{9}$/;
        // Simple processing pass clean numerical extraction check
        const cleanPhone = elements.custMobile.value.replace(/[-+ _]/g, '');
        if (cleanPhone.length > 0 && cleanPhone.length < 10) {
            showToast("Warning: Provided contact mobile architecture number length looks inaccurate.", "error");
        }

        if (state.items.length === 0) {
            showToast("Validation Error: Cannot compute operations on empty product item lists.", "error");
            return false;
        }

        let dynamicRowCheckPassed = true;
        state.items.forEach(item => {
            if (!item.name.trim()) {
                showToast("Validation Error: One or more Line Items is missing an item Name description.", "error");
                dynamicRowCheckPassed = false;
            }
            if (item.quantity <= 0) {
                showToast("Validation Error: Minimum quantity configuration parameter must be at least 1 unit.", "error");
                dynamicRowCheckPassed = false;
            }
            if (item.price < 0) {
                showToast("Validation Error: Pricing parameters cannot be set below zero metrics bounds.", "error");
                dynamicRowCheckPassed = false;
            }
        });

        return dynamicRowCheckPassed;
    }

    // --- Action Button Dispatch Functions (PDF Engine, Print, Share) ---
    function downloadInvoiceAsPDF() {
        if (!validateFormStructure()) return;

        const targetDocumentElement = document.getElementById('invoice-print-target');
        
        // Visual processing feedback metrics trigger loop
        elements.btnDownload.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing PDF...`;
        elements.btnDownload.disabled = true;

        const transformationOptions = {
            margin:       [10, 10, 10, 10],
            filename:     `${state.invoiceNumber}_${elements.custName.value.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Execution of external compiled engine
        html2pdf().set(transformationOptions).from(targetDocumentElement).save().then(async () => {
            elements.btnDownload.innerHTML = `<i class="fa-solid fa-download"></i> Download PDF`;
            elements.btnDownload.disabled = false;
            showToast("Invoice PDF compilation deployed and downloaded successfully.");
            
            await recordBillingEntry();
            
            // Advance internal tracking operational counter state
            incrementInvoiceCounter();
            loadInvoiceCounter();
        }).catch(err => {
            console.error("PDF Compilation System Error Trace:", err);
            elements.btnDownload.innerHTML = `<i class="fa-solid fa-download"></i> Download PDF`;
            elements.btnDownload.disabled = false;
            showToast("Fatal processing error inside PDF Generation layer.", "error");
        });
    }

    function printInvoice() {
        if (!validateFormStructure()) return;
        window.print();
    }

    function shareInvoice() {
        if (!validateFormStructure()) return;
        
        if (navigator.share) {
            navigator.share({
                title: `Invoice ${state.invoiceNumber} — Lifestoning Pvt Ltd`,
                text: `Tax Invoice total for ${elements.custName.value} matching total aggregate metrics value: ${elements.lblGrandtotal.textContent}`,
                url: window.location.href
            }).then(() => {
                showToast("Share options platform sheet mounted successfully.");
            }).catch(err => {
                // If sharing interface was dismissed by context operator, ignore trace failure warning
                console.log("Sharing sheet operational dismissal handler.");
            });
        } else {
            // Fallback strategy if target system parameters don't host internal hardware programmatic API distribution features
            navigator.clipboard.writeText(`Invoice ID: ${state.invoiceNumber} | Client: ${elements.custName.value} | Total: ${elements.lblGrandtotal.textContent}`);
            showToast("Share summary string payload duplicated onto OS clipboard data pipeline.");
        }
    }

    function buildBillingRecord() {
        const subtotal = parseFloat(elements.lblSubtotal.textContent.replace(/[₹, ]/g, '')) || 0;
        const discount = parseFloat(elements.lblDiscount.textContent.replace(/[₹, ]/g, '')) || 0;
        const cgst = parseFloat(elements.lblCgst.textContent.replace(/[₹, ]/g, '')) || 0;
        const sgst = parseFloat(elements.lblSgst.textContent.replace(/[₹, ]/g, '')) || 0;
        const roundoff = parseFloat(elements.lblRoundoff.textContent.replace(/[₹, ]/g, '')) || 0;
        const grandTotal = parseFloat(elements.lblGrandtotal.textContent.replace(/[₹, ]/g, '')) || 0;

        return {
            invoiceNumber: state.invoiceNumber,
            date: elements.invDate.value,
            dueDate: elements.invDue.value,
            customerName: elements.custName.value.trim(),
            customerShop: elements.custShop.value.trim(),
            customerMobile: elements.custMobile.value.trim(),
            customerGST: elements.custGst.value.trim(),
            customerAddress: elements.custAddress.value.trim(),
            latitude: state.geo.latitude,
            longitude: state.geo.longitude,
            geoAccuracy: state.geo.accuracy,
            paymentMethod: elements.payMethod.value,
            paymentStatus: elements.payStatus.value,
            notes: elements.invoiceNotes.value.trim(),
            subtotal: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            cgst: cgst.toFixed(2),
            sgst: sgst.toFixed(2),
            roundoff: roundoff.toFixed(2),
            grandTotal: grandTotal.toFixed(2),
            itemsCount: state.items.length,
            items: state.items.map(item => ({
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                gst: item.gst
            })),
            exportedAt: new Date().toISOString()
        };
    }

    function getBillingHistory() {
        const historyString = localStorage.getItem('ls-billing-history');
        if (!historyString) return [];
        try {
            return JSON.parse(historyString) || [];
        } catch (error) {
            console.error('Billing history parse failed:', error);
            return [];
        }
    }

    function saveBillingHistory(history) {
        localStorage.setItem('ls-billing-history', JSON.stringify(history));
    }

    function pushBillingHistory(record) {
        const history = getBillingHistory();
        history.push(record);
        saveBillingHistory(history);
        return history;
    }

    function sanitizeCsvCell(value) {
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
    }

    function generateCsvFromHistory(history) {
        const header = [
            'Invoice Number', 'Date', 'Due Date', 'Customer Name', 'Shop/Company', 'Mobile', 'GSTIN', 'Address',
            'Latitude', 'Longitude', 'Geo Accuracy', 'Payment Method', 'Payment Status', 'Notes',
            'Subtotal', 'Discount', 'CGST', 'SGST', 'Roundoff', 'Grand Total', 'Items Count', 'Items Details', 'Exported At'
        ];

        const rows = history.map(record => {
            const itemsDetail = record.items.map(item => `${item.name} (${item.category}) x${item.quantity} @₹${item.price.toFixed(2)} disc:${item.discount}% gst:${item.gst}%`).join(' | ');
            return [
                record.invoiceNumber,
                record.date,
                record.dueDate,
                record.customerName,
                record.customerShop,
                record.customerMobile,
                record.customerGST,
                record.customerAddress,
                record.latitude,
                record.longitude,
                record.geoAccuracy,
                record.paymentMethod,
                record.paymentStatus,
                record.notes,
                record.subtotal,
                record.discount,
                record.cgst,
                record.sgst,
                record.roundoff,
                record.grandTotal,
                record.itemsCount,
                itemsDetail,
                record.exportedAt
            ].map(sanitizeCsvCell).join(',');
        });

        return [header.map(sanitizeCsvCell).join(','), ...rows].join('\r\n');
    }

    function downloadCsvFile(filename, csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function openHandleDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('billing-csv-db', 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('file-handles')) {
                    db.createObjectStore('file-handles');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function getStoredBillingCsvHandle() {
        try {
            const db = await openHandleDatabase();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction('file-handles', 'readonly');
                const store = transaction.objectStore('file-handles');
                const request = store.get('billing-csv-handle');
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Could not open IndexedDB for billing handle:', error);
            return null;
        }
    }

    async function storeBillingCsvHandle(handle) {
        try {
            const db = await openHandleDatabase();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction('file-handles', 'readwrite');
                const store = transaction.objectStore('file-handles');
                const request = store.put(handle, 'billing-csv-handle');
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Could not persist billing CSV handle:', error);
            return false;
        }
    }

    async function verifyPermission(handle, mode = 'readwrite') {
        if (!handle) return false;
        if (await handle.queryPermission({ mode }) === 'granted') return true;
        if (await handle.requestPermission({ mode }) === 'granted') return true;
        return false;
    }

    async function ensureBillingCsvHandle() {
        if (billingCsvHandle) return billingCsvHandle;

        billingCsvHandle = await getStoredBillingCsvHandle();
        if (billingCsvHandle) return billingCsvHandle;

        if (!window.showOpenFilePicker) return null;

        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'CSV files',
                    accept: { 'text/csv': ['.csv'] }
                }],
                excludeAcceptAllOption: true,
                multiple: false
            });
            billingCsvHandle = handle;
            await storeBillingCsvHandle(handle);
            return billingCsvHandle;
        } catch (error) {
            console.warn('Billing CSV file access not granted:', error);
            return null;
        }
    }

    async function saveCsvToBillingFile(csvContent) {
        const handle = await ensureBillingCsvHandle();
        if (!handle) return false;

        try {
            if (!(await verifyPermission(handle, 'readwrite'))) {
                return false;
            }
            const writable = await handle.createWritable();
            await writable.write(csvContent);
            await writable.close();
            return true;
        } catch (error) {
            console.error('Failed to write billing.csv:', error);
            return false;
        }
    }

    async function writeBillingCsv(history) {
        const csv = generateCsvFromHistory(history);
        const savedToFile = await saveCsvToBillingFile(csv);
        if (!savedToFile) {
            downloadCsvFile(BILLING_CSV_FILENAME, csv);
            showToast('Billing CSV downloaded as fallback because file access was not granted.', 'error');
            return false;
        }
        return true;
    }

    async function exportInvoiceHistoryToCSV() {
        const history = getBillingHistory();
        if (history.length === 0) {
            showToast('No billing history available for CSV export.', 'error');
            return;
        }
        const success = await writeBillingCsv(history);
        if (success) {
            showToast('billing.csv updated successfully.');
        }
    }

    async function recordBillingEntry() {
        const record = buildBillingRecord();
        const history = pushBillingHistory(record);
        await writeBillingCsv(history);
        showToast('Billing record saved and billing.csv updated successfully.');
    }

    function fetchGeolocation() {
        if (!navigator.geolocation) {
            state.geo.latitude = '';
            state.geo.longitude = '';
            state.geo.accuracy = '';
            return;
        }

        navigator.geolocation.getCurrentPosition(position => {
            state.geo.latitude = position.coords.latitude.toString();
            state.geo.longitude = position.coords.longitude.toString();
            state.geo.accuracy = position.coords.accuracy ? `${position.coords.accuracy}m` : '';
            updateGeoPreview();
        }, error => {
            console.warn('Geolocation fetch failed:', error);
            state.geo.latitude = '';
            state.geo.longitude = '';
            state.geo.accuracy = '';
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        });
    }

    function updateGeoPreview() {
        if (state.geo.latitude && state.geo.longitude) {
            showToast(`Geolocation captured: ${state.geo.latitude}, ${state.geo.longitude}`);
        }
    }

    // --- Local Storage Sync State Machinery ---
    function autoSaveDraft() {
        const structuralDraftPayload = {
            customer: {
                name: elements.custName.value,
                shop: elements.custShop.value,
                mobile: elements.custMobile.value,
                gst: elements.custGst.value,
                address: elements.custAddress.value
            },
            meta: {
                date: elements.invDate.value,
                due: elements.invDue.value,
                method: elements.payMethod.value,
                status: elements.payStatus.value,
                notes: elements.invoiceNotes.value
            },
            items: state.items
        };
        localStorage.setItem('ls-invoice-draft', JSON.stringify(structuralDraftPayload));
    }

    function loadSavedDraft() {
        const analyticalDraftString = localStorage.getItem('ls-invoice-draft');
        if (!analyticalDraftString) return;

        try {
            const draft = JSON.parse(analyticalDraftString);
            
            elements.custName.value = draft.customer.name || "";
            elements.custShop.value = draft.customer.shop || "";
            elements.custMobile.value = draft.customer.mobile || "";
            elements.custGst.value = draft.customer.gst || "";
            elements.custAddress.value = draft.customer.address || "";
            
            if (draft.meta.date) elements.invDate.value = draft.meta.date;
            if (draft.meta.due) elements.invDue.value = draft.meta.due;
            
            elements.payMethod.value = draft.meta.method || "UPI";
            elements.payStatus.value = draft.meta.status || "Paid";
            elements.invoiceNotes.value = draft.meta.notes || "";

            state.items = draft.items || [];
        } catch (e) {
            console.error("Draft extraction fallback parsing crash handled: structural reset executed.", e);
            localStorage.removeItem('ls-invoice-draft');
        }
    }

    function resetBillingConsole() {
        if(confirm("Confirm action: Clear all current operational draft entries?")) {
            localStorage.removeItem('ls-invoice-draft');
            state.items = [];
            elements.itemsTbody.innerHTML = '';
            
            elements.custName.value = '';
            elements.custShop.value = '';
            elements.custMobile.value = '';
            elements.custGst.value = '';
            elements.custAddress.value = '';
            elements.invoiceNotes.value = '';
            
            initDates();
            addItemRow();
            showToast("System Console states reset safely.");
        }
    }

    // --- UI/UX Interactive Event Core Handlers ---
    function registerEventHandlers() {
        elements.themeToggle.addEventListener('click', toggleThemeMode);
        elements.btnAddItem.addEventListener('click', () => addItemRow());
        
        // Track core focus changes to mirror outputs
        const formSyncTriggers = [
            elements.custName, elements.custShop, elements.custMobile, 
            elements.custGst, elements.custAddress, elements.invDate, 
            elements.invDue, elements.payMethod, elements.payStatus, elements.invoiceNotes
        ];
        
        formSyncTriggers.forEach(element => {
            element.addEventListener('input', () => {
                updateStaticPreviewFields();
                autoSaveDraft();
            });
            element.addEventListener('change', () => {
                updateStaticPreviewFields();
                autoSaveDraft();
            });
        });

        // Register control action executions
        elements.btnDownload.addEventListener('click', downloadInvoiceAsPDF);
        elements.btnPrint.addEventListener('click', printInvoice);
        elements.btnReset.addEventListener('click', resetBillingConsole);
        elements.btnShare.addEventListener('click', shareInvoice);
        elements.btnCsv.addEventListener('click', exportInvoiceHistoryToCSV);
    }

    function toggleThemeMode() {
        const currentContextTheme = document.documentElement.getAttribute('data-theme');
        const updatedThemeTarget = currentContextTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', updatedThemeTarget);
        localStorage.setItem('ls-theme', updatedThemeTarget);
        updateThemeButtonUI(updatedThemeTarget);
        showToast(`Interface switched to ${updatedThemeTarget} mode configuration framework.`);
    }

    function updateThemeButtonUI(theme) {
        if (theme === 'dark') {
            elements.themeToggle.innerHTML = `<i class="fa-solid fa-sun"></i> <span>Light Mode</span>`;
        } else {
            elements.themeToggle.innerHTML = `<i class="fa-solid fa-moon"></i> <span>Dark Mode</span>`;
        }
    }

    // --- Global Application Component Tools Helper Layer ---
    function formatDate(rawInputStringDate) {
        if (!rawInputStringDate) return "-";
        const parts = rawInputStringDate.split('-');
        if (parts.length !== 3) return rawInputStringDate;
        return `${parts[2]}/${parts[1]}/${parts[0]}`; // Convert international ISO string formatting index into direct Standard Indian localization structural template formatting
    }

    function showToast(message, type = "success") {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'error' : ''}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${message}`;
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Force browser layout repaint recalculation metric trigger to seamlessly slide transform transitions execution smoothly
        setTimeout(() => toast.classList.add('show'), 50);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Execute app init engine loop sequence
    init();
});