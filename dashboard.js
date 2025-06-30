// JavaScript للوحة إدارة مسجد هيلة الحربي

// إعدادات الـ API
const API_CONFIG = {
    baseURL: 'https://inviting-pleasantly-barnacle.ngrok-free.app/api',
    mosqueId: 1, // معرف مسجد هيلة الحربي
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// متغيرات عامة
let currentSection = 'dashboard';
let studentsData = [];
let teachersData = [];
let circlesData = [];
let attendanceData = {};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setTodayDate();
    loadDashboardData();
    
    // تحديث البيانات كل 5 دقائق
    setInterval(loadDashboardData, 5 * 60 * 1000);
}

function setupEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showSection(section);
        });
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadCurrentSectionData();
    });

    // Student form
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentSubmit);
    }

    // Transfer type radio buttons
    document.querySelectorAll('input[name="transferType"]').forEach(radio => {
        radio.addEventListener('change', toggleTransferType);
    });

    // Date inputs
    document.getElementById('attendanceDate').addEventListener('change', loadAttendanceData);
    document.getElementById('teachersDate').addEventListener('change', loadTeachersData);

    // Student search
    const studentSearch = document.getElementById('studentSearch');
    if (studentSearch) {
        studentSearch.addEventListener('input', filterStudents);
    }

    // Circle and status filters
    document.getElementById('circleFilter').addEventListener('change', filterStudents);
    document.getElementById('statusFilter').addEventListener('change', filterStudents);

    // Transfer student selection
    document.getElementById('transferStudent').addEventListener('change', updateCurrentCircle);
    document.getElementById('sourceCircle').addEventListener('change', loadSourceStudents);
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    document.getElementById('teachersDate').value = today;
}

// === Navigation Functions ===
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionName).classList.add('active');

    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    currentSection = sectionName;
    loadCurrentSectionData();
}

function loadCurrentSectionData() {
    switch(currentSection) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'students':
            loadStudentsData();
            break;
        case 'attendance':
            loadAttendanceData();
            break;
        case 'teachers':
            loadTeachersData();
            break;
        case 'reports':
            loadReportsData();
            break;
    }
}

// === API Functions ===
async function apiRequest(endpoint, options = {}) {
    showLoading();
    try {
        // استخدام الرابط مباشرة بعد حل مشكلة CORS
        const url = `${API_CONFIG.baseURL}${endpoint}`;
        
        // استخدام headers مختلفة حسب نوع الطلب
        const isGetRequest = !options.method || options.method === 'GET';
        const headers = isGetRequest ? {
            'ngrok-skip-browser-warning': 'true'
        } : {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        };
        
        const config = {
            headers: headers,
            ...options
        };

        const response = await fetch(url, config);
        
        if (!response.ok) {
            // طباعة تفاصيل الخطأ
            const errorText = await response.text();
            console.error(`HTTP ${response.status} - URL: ${url}`);
            console.error('Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // التحقق من نوع المحتوى
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('Expected JSON but got:', contentType);
            console.error('Response text:', responseText);
            throw new Error('Invalid response format - expected JSON');
        }

        const data = await response.json();
        hideLoading();
        return data;
    } catch (error) {
        hideLoading();
        console.error('API Request Error:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
        throw error;
    }
}

// === Dashboard Functions ===
async function loadDashboardData() {
    try {
        // تحميل الإحصائيات العامة
        await Promise.all([
            loadGeneralStats(),
            loadRecentActivity(),
            loadCirclesData()
        ]);
    } catch (error) {
        console.error('Dashboard loading error:', error);
    }
}

async function loadGeneralStats() {
    try {
        // تحميل إحصائيات الطلاب
        const studentsResponse = await apiRequest(`/students?mosque_id=${API_CONFIG.mosqueId}`);
        if (studentsResponse.نجح && studentsResponse.البيانات) {
            document.getElementById('totalStudents').textContent = studentsResponse.البيانات.length;
        }

        // تحميل إحصائيات المعلمين  
        const teachersResponse = await apiRequest(`/teachers?mosque_id=${API_CONFIG.mosqueId}`);
        if (teachersResponse.نجح && teachersResponse.البيانات) {
            document.getElementById('totalTeachers').textContent = teachersResponse.البيانات.length;
        }

        // تحميل إحصائيات الحلقات
        const circlesResponse = await apiRequest(`/circles?mosque_id=${API_CONFIG.mosqueId}`);
        if (circlesResponse.نجح && circlesResponse.البيانات) {
            document.getElementById('totalCircles').textContent = circlesResponse.البيانات.length;
            circlesData = circlesResponse.البيانات;
        }

        // تحميل حضور اليوم (محاكاة)
        document.getElementById('todayAttendance').textContent = Math.floor(Math.random() * 100) + '%';

    } catch (error) {
        console.error('Stats loading error:', error);
        // عرض قيم افتراضية في حالة الخطأ
        document.getElementById('totalStudents').textContent = '0';
        document.getElementById('totalTeachers').textContent = '0';
        document.getElementById('totalCircles').textContent = '0';
        document.getElementById('todayAttendance').textContent = '0%';
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('recentActivityList');
    
    // محاكاة النشاط الأخير
    const mockActivity = [
        {
            type: 'success',
            title: 'تم إضافة طالب جديد',
            description: 'أحمد محمد - الحلقة الأولى',
            time: '2 دقائق'
        },
        {
            type: 'info', 
            title: 'تم تسجيل حضور الحلقة الثانية',
            description: '25 طالب من أصل 30',
            time: '15 دقيقة'
        },
        {
            type: 'warning',
            title: 'تحديث بيانات معلم',
            description: 'الأستاذ خالد العمري',
            time: '1 ساعة'
        }
    ];

    activityList.innerHTML = mockActivity.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="fas fa-${activity.type === 'success' ? 'check' : activity.type === 'info' ? 'info' : 'exclamation'}"></i>
            </div>
            <div class="activity-content">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
            </div>
            <div class="activity-time">منذ ${activity.time}</div>
        </div>
    `).join('');
}

// === Students Functions ===
async function loadStudentsData() {
    try {
        const response = await apiRequest(`/students?mosque_id=${API_CONFIG.mosqueId}`);
        if (response.نجح && response.البيانات) {
            studentsData = response.البيانات;
            displayStudents(studentsData);
            populateCircleFilters();
        }
    } catch (error) {
        console.error('Students loading error:', error);
        document.getElementById('studentsList').innerHTML = `
            <div class="info-message">
                <i class="fas fa-exclamation-circle"></i>
                لا يمكن تحميل بيانات الطلاب حالياً
            </div>
        `;
    }
}

function displayStudents(students) {
    const studentsList = document.getElementById('studentsList');
    
    if (!students || students.length === 0) {
        studentsList.innerHTML = `
            <div class="info-message">
                <i class="fas fa-users"></i>
                لا توجد بيانات طلاب متاحة
            </div>
        `;
        return;
    }

    studentsList.innerHTML = students.map(student => `
        <div class="student-card">
            <div class="student-header">
                <div class="student-name">${student.الاسم || student.name}</div>
                <div class="student-id">${student.رقم_الطالب || student.identity_number}</div>
            </div>
            <div class="student-info">
                <div class="info-item">
                    <i class="fas fa-phone"></i>
                    ${student.رقم_الهاتف || student.phone || 'غير محدد'}
                </div>
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    ${student.تاريخ_التسجيل || student.enrollment_date || 'غير محدد'}
                </div>
                <div class="info-item">
                    <i class="fas fa-graduation-cap"></i>
                    ${student.المستوى_التعليمي || student.education_level || 'غير محدد'}
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    ${student.الحي || student.neighborhood || 'غير محدد'}
                </div>
            </div>
            <div class="student-actions">
                <button class="btn btn-primary" onclick="editStudent(${student.id})">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="btn btn-warning" onclick="transferStudentById(${student.id})">
                    <i class="fas fa-exchange-alt"></i> نقل
                </button>
                <button class="btn btn-secondary" onclick="viewStudentDetails(${student.id})">
                    <i class="fas fa-eye"></i> تفاصيل
                </button>
            </div>
        </div>
    `).join('');
}

function showAddStudentForm() {
    document.getElementById('addStudentForm').style.display = 'block';
    populateCircleOptions();
}

function hideAddStudentForm() {
    document.getElementById('addStudentForm').style.display = 'none';
    document.getElementById('studentForm').reset();
}

async function populateCircleOptions() {
    const select = document.getElementById('quranCircle');
    const transferSelect = document.getElementById('newCircle');
    const sourceSelect = document.getElementById('sourceCircle');
    const targetSelect = document.getElementById('targetCircle');
    
    if (circlesData.length === 0) {
        await loadCirclesData();
    }

    const optionsHTML = circlesData.map(circle => 
        `<option value="${circle.id}">${circle.الاسم || circle.name}</option>`
    ).join('');

    if (select) {
        select.innerHTML = '<option value="">اختر الحلقة</option>' + optionsHTML;
    }
    if (transferSelect) {
        transferSelect.innerHTML = '<option value="">اختر الحلقة الجديدة</option>' + optionsHTML;
    }
    if (sourceSelect) {
        sourceSelect.innerHTML = '<option value="">اختر الحلقة المصدر</option>' + optionsHTML;
    }
    if (targetSelect) {
        targetSelect.innerHTML = '<option value="">اختر الحلقة الهدف</option>' + optionsHTML;
    }
}

async function loadCirclesData() {
    try {
        // جلب الحلقات والحلقات الفرعية معاً
        const response = await apiRequest(`/circles/all-with-groups?mosque_id=${API_CONFIG.mosqueId}`);
        if (response.نجح && response.البيانات) {
            circlesData = response.البيانات;
            updateCircleSelectors();
        }
    } catch (error) {
        console.error('Circles loading error:', error);
    }
}

function updateCircleSelectors() {
    // تحديث قوائم الحلقات في جميع أماكن النقل
    const selectors = [
        document.getElementById('targetCircle'),
        document.getElementById('bulkTargetCircle')
    ];
    
    selectors.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">اختر الحلقة</option>';
            
            circlesData.forEach(circle => {
                const option = document.createElement('option');
                option.value = circle.id;
                
                if (circle.type === 'main') {
                    option.textContent = `📚 ${circle.name} (حلقة رئيسية)`;
                    option.style.fontWeight = 'bold';
                } else if (circle.type === 'sub') {
                    option.textContent = `   └── ${circle.name} (${circle.teacher})`;
                    option.style.paddingLeft = '20px';
                }
                
                select.appendChild(option);
            });
        }
    });
}

async function handleStudentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const studentData = {
        name: formData.get('name'),
        identity_number: formData.get('identity_number'),
        phone: formData.get('phone'),
        guardian_name: formData.get('guardian_name'),
        guardian_phone: formData.get('guardian_phone'),
        birth_date: formData.get('birth_date'),
        nationality: formData.get('nationality'),
        neighborhood: formData.get('neighborhood'),
        education_level: formData.get('education_level'),
        quran_circle_id: formData.get('quran_circle_id'),
        mosque_id: API_CONFIG.mosqueId,
        is_active: true,
        enrollment_date: new Date().toISOString().split('T')[0]
    };

    try {
        const response = await apiRequest('/students', {
            method: 'POST',
            body: JSON.stringify(studentData)
        });

        if (response.نجح || response.success) {
            showToast('تم إضافة الطالب بنجاح', 'success');
            hideAddStudentForm();
            loadStudentsData();
        } else {
            showToast('فشل في إضافة الطالب', 'error');
        }
    } catch (error) {
        console.error('Student creation error:', error);
        showToast('حدث خطأ أثناء إضافة الطالب', 'error');
    }
}

function filterStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const circleFilter = document.getElementById('circleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let filteredStudents = studentsData.filter(student => {
        const nameMatch = (student.الاسم || student.name || '').toLowerCase().includes(searchTerm);
        const idMatch = (student.رقم_الطالب || student.identity_number || '').toLowerCase().includes(searchTerm);
        const circleMatch = !circleFilter || (student.quran_circle_id == circleFilter);
        const statusMatch = !statusFilter || (student.is_active == statusFilter);

        return (nameMatch || idMatch) && circleMatch && statusMatch;
    });

    displayStudents(filteredStudents);
}

function populateCircleFilters() {
    const circleFilter = document.getElementById('circleFilter');
    const options = circlesData.map(circle => 
        `<option value="${circle.id}">${circle.الاسم || circle.name}</option>`
    ).join('');
    
    circleFilter.innerHTML = '<option value="">جميع الحلقات</option>' + options;
}

// === Transfer Functions ===
function showTransferSection() {
    showSection('students');
    document.getElementById('transferSection').style.display = 'block';
    populateTransferOptions();
}

function toggleTransferType() {
    const transferType = document.querySelector('input[name="transferType"]:checked').value;
    const singleTransfer = document.getElementById('singleTransfer');
    const bulkTransfer = document.getElementById('bulkTransfer');

    if (transferType === 'single') {
        singleTransfer.style.display = 'block';
        bulkTransfer.style.display = 'none';
    } else {
        singleTransfer.style.display = 'none';
        bulkTransfer.style.display = 'block';
    }
}

async function populateTransferOptions() {
    const transferStudent = document.getElementById('transferStudent');
    
    if (studentsData.length === 0) {
        await loadStudentsData();
    }

    const studentsOptions = studentsData.map(student => 
        `<option value="${student.id}" data-circle="${student.quran_circle_id}">${student.الاسم || student.name}</option>`
    ).join('');

    transferStudent.innerHTML = '<option value="">اختر الطالب</option>' + studentsOptions;
    populateCircleOptions();
}

function updateCurrentCircle() {
    const transferStudent = document.getElementById('transferStudent');
    const currentCircle = document.getElementById('currentCircle');
    const selectedOption = transferStudent.options[transferStudent.selectedIndex];
    
    if (selectedOption.value) {
        const circleId = selectedOption.dataset.circle;
        const circle = circlesData.find(c => c.id == circleId);
        currentCircle.value = circle ? (circle.الاسم || circle.name) : 'غير محدد';
    } else {
        currentCircle.value = '';
    }
}

async function transferStudent() {
    const studentId = document.getElementById('transferStudent').value;
    const newCircleId = document.getElementById('newCircle').value;
    const reason = document.getElementById('transferReason').value;

    if (!studentId || !newCircleId) {
        showToast('يرجى تحديد الطالب والحلقة الجديدة', 'warning');
        return;
    }

    const transferData = {
        student_id: parseInt(studentId),
        current_circle_id: parseInt(document.getElementById('transferStudent').options[document.getElementById('transferStudent').selectedIndex].dataset.circle),
        requested_circle_id: parseInt(newCircleId),
        transfer_reason: reason || 'نقل إداري',
        notes: 'تم النقل من لوحة إدارة المسجد'
    };

    try {
        const response = await apiRequest('/supervisors/student-transfer', {
            method: 'POST',
            body: JSON.stringify(transferData)
        });

        if (response.success) {
            showToast('تم تقديم طلب النقل بنجاح', 'success');
            document.getElementById('transferReason').value = '';
            loadStudentsData();
        } else {
            showToast('فشل في تقديم طلب النقل', 'error');
        }
    } catch (error) {
        console.error('Transfer error:', error);
        showToast('حدث خطأ أثناء النقل', 'error');
    }
}

async function loadSourceStudents() {
    const sourceCircleId = document.getElementById('sourceCircle').value;
    const sourceStudentsContainer = document.getElementById('sourceStudents');

    if (!sourceCircleId) {
        sourceStudentsContainer.innerHTML = '';
        return;
    }

    const circleStudents = studentsData.filter(student => student.quran_circle_id == sourceCircleId);
    
    sourceStudentsContainer.innerHTML = circleStudents.map(student => `
        <div class="student-checkbox">
            <input type="checkbox" id="student_${student.id}" value="${student.id}">
            <label for="student_${student.id}">${student.الاسم || student.name}</label>
        </div>
    `).join('');
}

async function bulkTransferStudents() {
    const targetCircleId = document.getElementById('targetCircle').value;
    const reason = document.getElementById('bulkTransferReason').value;
    const selectedStudents = Array.from(document.querySelectorAll('#sourceStudents input:checked')).map(cb => cb.value);

    if (!targetCircleId || selectedStudents.length === 0) {
        showToast('يرجى تحديد الحلقة الهدف والطلاب المراد نقلهم', 'warning');
        return;
    }

    try {
        const promises = selectedStudents.map(studentId => {
            return apiRequest('/supervisors/student-transfer', {
                method: 'POST',
                body: JSON.stringify({
                    student_id: parseInt(studentId),
                    current_circle_id: parseInt(document.getElementById('sourceCircle').value),
                    requested_circle_id: parseInt(targetCircleId),
                    transfer_reason: reason || 'نقل جماعي إداري',
                    notes: 'نقل جماعي من لوحة إدارة المسجد'
                })
            });
        });

        await Promise.all(promises);
        showToast(`تم تقديم طلبات النقل لـ ${selectedStudents.length} طالب`, 'success');
        document.getElementById('bulkTransferReason').value = '';
        loadStudentsData();
    } catch (error) {
        console.error('Bulk transfer error:', error);
        showToast('حدث خطأ أثناء النقل الجماعي', 'error');
    }
}

function transferStudentById(studentId) {
    showTransferSection();
    document.getElementById('transferStudent').value = studentId;
    updateCurrentCircle();
}

// === Attendance Functions ===
async function loadAttendanceData() {
    const date = document.getElementById('attendanceDate').value;
    
    try {
        await loadCirclesTabs();
        // محاكاة بيانات الحضور
        attendanceData = {};
    } catch (error) {
        console.error('Attendance loading error:', error);
    }
}

async function loadCirclesTabs() {
    const circlesTabsContainer = document.getElementById('circlesTabs');
    
    if (circlesData.length === 0) {
        await loadCirclesData();
    }

    circlesTabsContainer.innerHTML = circlesData.map((circle, index) => `
        <div class="circle-tab ${index === 0 ? 'active' : ''}" onclick="selectCircle(${circle.id})">
            ${circle.الاسم || circle.name}
        </div>
    `).join('');

    if (circlesData.length > 0) {
        selectCircle(circlesData[0].id);
    }
}

async function selectCircle(circleId) {
    // تحديث التبويبات
    document.querySelectorAll('.circle-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // تحميل طلاب الحلقة
    try {
        const response = await apiRequest(`/circles/${circleId}/students`);
        if (response.نجح && response.البيانات) {
            displayAttendanceList(response.البيانات, circleId);
        }
    } catch (error) {
        console.error('Circle students loading error:', error);
        document.getElementById('attendanceList').innerHTML = `
            <div class="info-message">
                <i class="fas fa-exclamation-circle"></i>
                لا يمكن تحميل طلاب هذه الحلقة
            </div>
        `;
    }
}

function displayAttendanceList(students, circleId) {
    const attendanceList = document.getElementById('attendanceList');
    
    if (!students || students.length === 0) {
        attendanceList.innerHTML = `
            <div class="info-message">
                <i class="fas fa-users"></i>
                لا توجد طلاب في هذه الحلقة
            </div>
        `;
        return;
    }

    attendanceList.innerHTML = students.map(student => `
        <div class="attendance-item">
            <div class="student-info-attendance">
                <div class="student-avatar">
                    ${(student.الاسم || student.name).charAt(0)}
                </div>
                <div>
                    <h4>${student.الاسم || student.name}</h4>
                    <p>${student.رقم_الطالب || student.identity_number}</p>
                </div>
            </div>
            <div class="status-buttons">
                <button class="status-btn present" onclick="setAttendanceStatus(${student.id}, 'present', this)">
                    <i class="fas fa-check"></i> حاضر
                </button>
                <button class="status-btn absent" onclick="setAttendanceStatus(${student.id}, 'absent', this)">
                    <i class="fas fa-times"></i> غائب
                </button>
                <button class="status-btn late" onclick="setAttendanceStatus(${student.id}, 'late', this)">
                    <i class="fas fa-clock"></i> متأخر
                </button>
                <button class="status-btn excused" onclick="setAttendanceStatus(${student.id}, 'excused', this)">
                    <i class="fas fa-user-check"></i> معذور
                </button>
            </div>
        </div>
    `).join('');

    // تهيئة بيانات الحضور للحلقة
    if (!attendanceData[circleId]) {
        attendanceData[circleId] = {};
    }
}

function setAttendanceStatus(studentId, status, button) {
    const circleId = document.querySelector('.circle-tab.active').onclick.toString().match(/\d+/)[0];
    
    // تحديث البيانات
    if (!attendanceData[circleId]) {
        attendanceData[circleId] = {};
    }
    attendanceData[circleId][studentId] = status;

    // تحديث الواجهة
    const attendanceItem = button.closest('.attendance-item');
    attendanceItem.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

function markAllPresent() {
    const activeCircleId = document.querySelector('.circle-tab.active').onclick.toString().match(/\d+/)[0];
    const attendanceItems = document.querySelectorAll('.attendance-item');
    
    attendanceItems.forEach(item => {
        const presentBtn = item.querySelector('.status-btn.present');
        if (presentBtn) {
            presentBtn.click();
        }
    });

    showToast('تم تحديد جميع الطلاب كحاضرين', 'success');
}

async function saveAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const attendanceEntries = [];

    for (const circleId in attendanceData) {
        for (const studentId in attendanceData[circleId]) {
            attendanceEntries.push({
                student_id: parseInt(studentId),
                date: date,
                status: attendanceData[circleId][studentId],
                circle_id: parseInt(circleId)
            });
        }
    }

    if (attendanceEntries.length === 0) {
        showToast('لا توجد بيانات حضور لحفظها', 'warning');
        return;
    }

    try {
        // محاكاة حفظ الحضور
        const promises = attendanceEntries.map(entry => {
            return apiRequest('/attendance/record', {
                method: 'POST',
                body: JSON.stringify({
                    student_name: `Student ${entry.student_id}`, // يجب الحصول على الاسم الفعلي
                    date: entry.date,
                    status: entry.status,
                    period: 'الفجر',
                    notes: 'تم التسجيل من لوحة إدارة المسجد'
                })
            });
        });

        await Promise.allSettled(promises);
        showToast(`تم حفظ حضور ${attendanceEntries.length} طالب`, 'success');
    } catch (error) {
        console.error('Attendance save error:', error);
        showToast('حدث خطأ أثناء حفظ الحضور', 'error');
    }
}

// === Teachers Functions ===
async function loadTeachersData() {
    const date = document.getElementById('teachersDate').value;
    
    try {
        const response = await apiRequest(`/teachers?mosque_id=${API_CONFIG.mosqueId}`);
        if (response.نجح && response.البيانات) {
            teachersData = response.البيانات;
            displayTeachers(teachersData, date);
        }
    } catch (error) {
        console.error('Teachers loading error:', error);
        document.getElementById('teachersList').innerHTML = `
            <div class="info-message">
                <i class="fas fa-exclamation-circle"></i>
                لا يمكن تحميل بيانات المعلمين حالياً
            </div>
        `;
    }
}

function displayTeachers(teachers, date) {
    const teachersList = document.getElementById('teachersList');
    
    if (!teachers || teachers.length === 0) {
        teachersList.innerHTML = `
            <div class="info-message">
                <i class="fas fa-chalkboard-teacher"></i>
                لا توجد بيانات معلمين متاحة
            </div>
        `;
        return;
    }

    teachersList.innerHTML = teachers.map(teacher => {
        // محاكاة بيانات النشاط
        const hasPreparation = Math.random() > 0.3;
        const hasRecitation = Math.random() > 0.4;

        return `
            <div class="teacher-card">
                <div class="teacher-header">
                    <div class="teacher-avatar">
                        ${(teacher.الاسم || teacher.name).charAt(0)}
                    </div>
                    <div>
                        <div class="teacher-name">${teacher.الاسم || teacher.name}</div>
                        <div class="teacher-circle">${teacher.الحلقة || 'الحلقة الأولى'}</div>
                    </div>
                </div>
                <div class="teacher-activity">
                    <div class="activity-status ${hasPreparation ? 'active' : 'inactive'}">
                        <i class="fas fa-book"></i>
                        ${hasPreparation ? 'تم التحضير' : 'لم يحضر'}
                    </div>
                    <div class="activity-status ${hasRecitation ? 'active' : 'inactive'}">
                        <i class="fas fa-microphone"></i>
                        ${hasRecitation ? 'تم التسميع' : 'لم يسمع'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// === Reports Functions ===
async function loadReportsData() {
    try {
        await Promise.all([
            loadStudentsStats(),
            loadAttendanceStats(),
            loadProgressStats(),
            loadTeachersPerformance()
        ]);
        
        generateAttendanceChart();
    } catch (error) {
        console.error('Reports loading error:', error);
    }
}

async function loadStudentsStats() {
    // محاكاة البيانات
    document.getElementById('reportTotalStudents').textContent = studentsData.length || 0;
    document.getElementById('reportActiveStudents').textContent = Math.floor((studentsData.length || 0) * 0.9);
    document.getElementById('reportAvgAttendance').textContent = '85%';
}

async function loadAttendanceStats() {
    // سيتم التنفيذ مع الـ Chart.js
}

async function loadProgressStats() {
    document.getElementById('avgPartsMemorized').textContent = '2.5';
    document.getElementById('totalRecitationSessions').textContent = '150';
    document.getElementById('avgEvaluationGrade').textContent = '8.2';
}

async function loadTeachersPerformance() {
    const performanceContainer = document.getElementById('teachersPerformance');
    
    // محاكاة بيانات الأداء
    const mockPerformance = teachersData.map(teacher => ({
        name: teacher.الاسم || teacher.name,
        score: Math.floor(Math.random() * 40) + 60 // 60-100
    }));

    performanceContainer.innerHTML = mockPerformance.map(perf => {
        const scoreClass = perf.score >= 90 ? 'excellent' : perf.score >= 75 ? 'good' : 'average';
        return `
            <div class="teacher-performance-item">
                <div class="performance-name">${perf.name}</div>
                <div class="performance-score">
                    <span class="score-badge ${scoreClass}">${perf.score}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function generateAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                label: 'نسبة الحضور',
                data: [85, 90, 78, 92, 88, 85, 80],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// === Utility Functions ===
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon i');
    const messageEl = toast.querySelector('.toast-message');

    // تحديث المحتوى
    messageEl.textContent = message;
    
    // تحديث الأيقونة
    icon.className = `fas fa-${type === 'success' ? 'check-circle' : 
                            type === 'error' ? 'exclamation-circle' : 
                            type === 'warning' ? 'exclamation-triangle' : 'info-circle'}`;
    
    // تحديث الكلاس
    toast.querySelector('.toast-icon').className = `toast-icon ${type}`;
    
    // إظهار التوست
    toast.style.display = 'block';
    
    // إخفاء تلقائي بعد 3 ثوان
    setTimeout(hideToast, 3000);
}

function hideToast() {
    document.getElementById('toast').style.display = 'none';
}

// === Placeholder Functions ===
function editStudent(studentId) {
    showToast('ستتم إضافة وظيفة التعديل قريباً', 'info');
}

function viewStudentDetails(studentId) {
    showToast('ستتم إضافة وظيفة عرض التفاصيل قريباً', 'info');
}

function generateAttendanceReport() {
    showToast('ستتم إضافة وظيفة تقرير الحضور قريباً', 'info');
}

function generateProgressReport() {
    showToast('ستتم إضافة وظيفة تقرير التقدم قريباً', 'info');
}

function generateTeachersReport() {
    showToast('ستتم إضافة وظيفة تقرير المعلمين قريباً', 'info');
}

// === Error Handling ===
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    showToast('حدث خطأ غير متوقع', 'error');
});

// === Service Worker (اختياري للتطبيقات المتقدمة) ===
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}
