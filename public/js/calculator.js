document.addEventListener('DOMContentLoaded', function() {
   
    const floatingBtn = document.createElement('div');
    floatingBtn.className = 'floating-calculator';
    floatingBtn.setAttribute('aria-label', 'Open Labour Work Calculator');
    floatingBtn.innerHTML = '<i class="fas fa-calculator"></i>';
    document.body.appendChild(floatingBtn);
    const modal = document.createElement('div');
    modal.className = 'calculator-modal';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
    <div class="calculator-container">
        <div class="calculator-header">
            <h2>Labour Work Calculator</h2>
            <button class="close-calculator" aria-label="Close calculator">&times;</button>
        </div>
        <div class="calculator-body">
            <!-- LEFT COLUMN: INPUTS -->
            <div class="calculator-inputs">
                <form id="calculator-form">
                    <div class="form-group">
                        <label for="work-type">Work Type</label>
                        <select id="work-type">
                            <option value="">Select Work Type</option>
                            <option value="plumber">Plumber</option>
                            <option value="carpenter">Carpenter</option>
                            <option value="painter">Painter</option>
                            <option value="electrician">Electrician</option>
                            <option value="cleaner">Cleaner</option>
                            <option value="cook">Cook</option>
                            <option value="flooring">Flooring</option>
                            <option value="constructor">Constructor</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="workDays">Work Duration (Days)</label>
                            <input type="number" id="workDays" min="0" step="0.1" value="1">
                        </div>
                        <div class="form-group">
                            <label for="workHours">Additional Hours</label>
                            <input type="number" id="workHours" min="0" step="0.1" value="0">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="noOfLabourers">No. of Labourers</label>
                            <input type="number" id="noOfLabourers" min="1" value="1">
                        </div>
                        <div class="form-group">
                            <label for="baseWage">Base Wage (₹/hour)</label>
                            <input type="number" id="baseWage" min="0" value="0">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="overtimeHours">Overtime Hours</label>
                            <input type="number" id="overtimeHours" min="0" step="0.1" value="0">
                        </div>
                        <div class="form-group">
                            <label for="overtimeRate">Overtime Rate (%)</label>
                            <input type="number" id="overtimeRate" min="0" value="50">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="materialCost">Material Cost (₹)</label>
                            <input type="number" id="materialCost" min="0" value="0">
                        </div>
                        <div class="form-group">
                            <label for="tax">Tax (%)</label>
                            <input type="number" id="tax" min="0" value="0">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="bonus">Bonus (₹)</label>
                            <input type="number" id="bonus" min="0" value="0">
                        </div>
                        <div class="form-group">
                            <label for="discount">Discount (%)</label>
                            <input type="number" id="discount" min="0" value="0">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="travel">Travel Cost (₹)</label>
                            <input type="number" id="travel" min="0" value="0">
                        </div>
                        <div class="form-group">
                            <label for="otherCharges">Other Charges (₹)</label>
                            <input type="number" id="otherCharges" min="0" value="0">
                        </div>
                    </div>
                </form>
            </div>

            <!-- RIGHT COLUMN: ACTIONS & RESULTS -->
            <div class="calculator-results-panel">
                <div class="form-actions">
                    <button type="button" class="calculate-btn">Calculate Total</button>
                    <button type="button" class="reset-btn">Reset</button>
                </div>
                
                <div class="calculation-result" id="calculation-result">
                    <h3>Cost Breakdown</h3>
                    <div class="result-item">
                        <span>Hours from Days:</span>
                        <span id="hoursFromDays">0</span>
                    </div>
                    <div class="result-item">
                        <span>Additional Hours:</span>
                        <span id="additionalHours">0</span>
                    </div>
                    <div class="result-item">
                        <span>Total Hours Worked:</span>
                        <span id="totalHours">0</span>
                    </div>
                    <div class="result-item">
                        <span>Total Labour Cost:</span>
                        <span id="labourCost">₹0</span>
                    </div>
                    <div class="result-item">
                        <span>Overtime Pay:</span>
                        <span id="overtimePay">₹0</span>
                    </div>
                    <div class="result-item">
                        <span>Tax Amount:</span>
                        <span id="taxAmount">₹0</span>
                    </div>
                    <div class="result-item final-payable">
                        <span>Final Payable:</span>
                        <span id="finalPayable">₹0</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;
    document.body.appendChild(modal);
    
    floatingBtn.addEventListener('click', function() {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    });
    
    document.querySelector('.close-calculator').addEventListener('click', function() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    });
    
    document.querySelector('.calculate-btn').addEventListener('click', function() {
        calculateTotal();
    });
    
    document.querySelector('.reset-btn').addEventListener('click', function() {
        document.getElementById('calculator-form').reset();
        document.getElementById('calculation-result').style.display = 'none';
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    });
    
    function calculateTotal() {
        
        const workDays = parseFloat(document.getElementById('workDays').value) || 0;
        const workHours = parseFloat(document.getElementById('workHours').value) || 0;
        const baseWage = parseFloat(document.getElementById('baseWage').value) || 0;
        const noOfLabourers = parseFloat(document.getElementById('noOfLabourers').value) || 0;
        const overtimeHours = parseFloat(document.getElementById('overtimeHours').value) || 0;
        const overtimeRate = parseFloat(document.getElementById('overtimeRate').value) || 0;
        const materialCost = parseFloat(document.getElementById('materialCost').value) || 0;
        const tax = parseFloat(document.getElementById('tax').value) || 0;
        const bonus = parseFloat(document.getElementById('bonus').value) || 0;
        const discount = parseFloat(document.getElementById('discount').value) || 0;
        const travel = parseFloat(document.getElementById('travel').value) || 0;
        const otherCharges = parseFloat(document.getElementById('otherCharges').value) || 0;
        const hoursFromDays = workDays * 24;
        const totalHours = hoursFromDays + workHours;
        const totalLabourCost = totalHours * baseWage * noOfLabourers;
        const overtimePay = baseWage * overtimeHours * (overtimeRate / 100) * noOfLabourers;
        const subtotal = totalLabourCost + overtimePay + materialCost;
        const taxAmount = subtotal * (tax / 100);
        const discountAmount = subtotal * (discount / 100);
        const finalPayable = subtotal + taxAmount + bonus + travel + otherCharges - discountAmount;
        
        
        document.getElementById('hoursFromDays').textContent = hoursFromDays.toFixed(1);
        document.getElementById('additionalHours').textContent = workHours.toFixed(1);
        document.getElementById('totalHours').textContent = totalHours.toFixed(1);
        document.getElementById('labourCost').textContent = `₹${totalLabourCost.toFixed(2)}`;
        document.getElementById('overtimePay').textContent = `₹${overtimePay.toFixed(2)}`;
        document.getElementById('taxAmount').textContent = `₹${taxAmount.toFixed(2)}`;
        document.getElementById('finalPayable').textContent = `₹${finalPayable.toFixed(2)}`;
        document.getElementById('calculation-result').style.display = 'block';
        console.log(`Calculation verification: ${workDays} days = ${hoursFromDays} hours, Total Labour Cost = ₹${totalLabourCost.toFixed(2)}`);
    }
});