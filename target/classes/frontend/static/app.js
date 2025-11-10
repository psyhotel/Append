const API_URL = '/api';

let mediaRecorder = null;
let audioChunks = [];
let recordingTime = 0;
let recordingInterval = null;
let currentNoteId = null;
let categories = [];
let notes = [];
let reminders = [];

async function init() {
    await loadCategories();
    await loadNotes();
    await loadReminders();
    
    document.getElementById('recordBtn').addEventListener('click', toggleRecording);
    document.getElementById('createNoteBtn').addEventListener('click', createNewNote);
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
    document.getElementById('deleteNoteBtn').addEventListener('click', deleteNote);
    document.getElementById('addReminderBtn').addEventListener('click', addReminder);
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    
    populateCategorySelects();
    renderNotes();
    renderUpcomingReminders();
}

async function loadCategories() {
    const response = await fetch(`${API_URL}/categories`);
    categories = await response.json();
}

async function loadNotes() {
    const response = await fetch(`${API_URL}/notes`);
    notes = await response.json();
}

async function loadReminders() {
    const response = await fetch(`${API_URL}/reminders`);
    reminders = await response.json();
}

function populateCategorySelects() {
    const selects = [document.getElementById('categorySelect'), document.getElementById('modalCategory')];
    selects.forEach(select => {
        select.innerHTML = '<option value="">Выберите категорию</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    });
}

function renderNotes() {
    const grid = document.getElementById('notesGrid');
    grid.innerHTML = '';
    
    notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.onclick = () => openNoteModal(note);
        
        const category = categories.find(c => c.id === note.categoryId);
        const categoryName = category ? category.name : 'Без категории';
        const categoryColor = category ? category.color : '#6B7280';
        
        const preview = note.transcription.substring(0, 150) + (note.transcription.length > 150 ? '...' : '');
        
        card.innerHTML = `
            <h3>${note.title || 'Без названия'}</h3>
            <p>${preview || 'Нет транскрипции'}</p>
            <div class="note-meta">
                <span class="category-badge" style="background-color: ${categoryColor}20; border-color: ${categoryColor}; color: ${categoryColor}">
                    ${categoryName}
                </span>
                <span style="color: #6B7280; font-size: 0.85rem;">
                    ${new Date(note.createdAt).toLocaleDateString('ru-RU')}
                </span>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

async function toggleRecording() {
    const btn = document.getElementById('recordBtn');
    const status = document.getElementById('recordingStatus');
    
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await uploadAndTranscribe(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            btn.classList.add('recording');
            btn.querySelector('.record-text').textContent = 'Остановить запись';
            status.classList.remove('hidden');
            
            recordingTime = 0;
            recordingInterval = setInterval(() => {
                recordingTime++;
                const mins = Math.floor(recordingTime / 60);
                const secs = recordingTime % 60;
                document.getElementById('recordTime').textContent = 
                    `${mins}:${secs.toString().padStart(2, '0')}`;
            }, 1000);
            
        } catch (error) {
            alert('Ошибка доступа к микрофону: ' + error.message);
        }
    } else {
        mediaRecorder.stop();
        btn.classList.remove('recording');
        btn.querySelector('.record-text').textContent = 'Начать запись';
        status.classList.add('hidden');
        clearInterval(recordingInterval);
    }
}

async function uploadAndTranscribe(audioBlob) {
    if (!currentNoteId) {
        const response = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Новая голосовая заметка' })
        });
        const note = await response.json();
        currentNoteId = note.id;
    }
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('noteId', currentNoteId);
    
    try {
        const response = await fetch(`${API_URL}/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        await loadNotes();
        renderNotes();
        
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
            openNoteModal(note);
        }
    } catch (error) {
        alert('Ошибка транскрибации: ' + error.message);
    }
}

async function createNewNote() {
    const title = document.getElementById('noteTitle').value;
    const categoryId = document.getElementById('categorySelect').value;
    
    if (!title) {
        alert('Введите название заметки');
        return;
    }
    
    const response = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, categoryId: categoryId || null })
    });
    
    const note = await response.json();
    currentNoteId = note.id;
    document.getElementById('noteTitle').value = '';
    
    await loadNotes();
    renderNotes();
    openNoteModal(note);
}

function openNoteModal(note) {
    currentNoteId = note.id;
    document.getElementById('modalTitle').textContent = note.title || 'Заметка';
    document.getElementById('modalNoteTitle').value = note.title || '';
    document.getElementById('modalCategory').value = note.categoryId || '';
    document.getElementById('modalTranscription').value = note.transcription || '';
    document.getElementById('aiReport').textContent = note.aiReport || '';
    
    const noteReminders = reminders.filter(r => r.noteId === note.id);
    renderNoteReminders(noteReminders);
    
    document.getElementById('noteModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('noteModal').classList.add('hidden');
    currentNoteId = null;
}

async function saveNote() {
    if (!currentNoteId) return;
    
    const title = document.getElementById('modalNoteTitle').value;
    const categoryId = document.getElementById('modalCategory').value;
    const transcription = document.getElementById('modalTranscription').value;
    
    await fetch(`${API_URL}/notes/${currentNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title, 
            categoryId: categoryId || null, 
            transcription 
        })
    });
    
    await loadNotes();
    renderNotes();
    alert('Заметка сохранена! ✅');
}

async function deleteNote() {
    if (!currentNoteId || !confirm('Удалить эту заметку?')) return;
    
    await fetch(`${API_URL}/notes/${currentNoteId}`, {
        method: 'DELETE'
    });
    
    closeModal();
    await loadNotes();
    renderNotes();
}

async function generateReport() {
    if (!currentNoteId) return;
    
    const btn = document.getElementById('generateReportBtn');
    btn.textContent = 'Создаю отчет...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/generate-report/${currentNoteId}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        document.getElementById('aiReport').textContent = result.report;
        
        await loadNotes();
    } catch (error) {
        alert('Ошибка создания отчета: ' + error.message);
    } finally {
        btn.textContent = 'Создать отчет';
        btn.disabled = false;
    }
}

async function addReminder() {
    if (!currentNoteId) return;
    
    const time = document.getElementById('reminderTime').value;
    const title = document.getElementById('reminderTitle').value;
    
    if (!time || !title) {
        alert('Заполните все поля напоминания');
        return;
    }
    
    await fetch(`${API_URL}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            noteId: currentNoteId,
            reminderTime: time,
            title,
            completed: false
        })
    });
    
    document.getElementById('reminderTime').value = '';
    document.getElementById('reminderTitle').value = '';
    
    await loadReminders();
    const noteReminders = reminders.filter(r => r.noteId === currentNoteId);
    renderNoteReminders(noteReminders);
    renderUpcomingReminders();
}

function renderNoteReminders(noteReminders) {
    const list = document.getElementById('remindersList');
    list.innerHTML = '';
    
    noteReminders.forEach(reminder => {
        const item = document.createElement('div');
        item.className = `reminder-item ${reminder.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <div>
                <strong>${reminder.title}</strong><br>
                <small>${new Date(reminder.reminderTime).toLocaleString('ru-RU')}</small>
            </div>
            <input type="checkbox" ${reminder.completed ? 'checked' : ''} 
                   onchange="toggleReminder('${reminder.id}', this.checked)">
        `;
        list.appendChild(item);
    });
}

function renderUpcomingReminders() {
    const list = document.getElementById('upcomingReminders');
    list.innerHTML = '';
    
    const upcoming = reminders
        .filter(r => !r.completed && new Date(r.reminderTime) > new Date())
        .sort((a, b) => new Date(a.reminderTime) - new Date(b.reminderTime))
        .slice(0, 5);
    
    upcoming.forEach(reminder => {
        const note = notes.find(n => n.id === reminder.noteId);
        const item = document.createElement('div');
        item.className = 'reminder-item';
        item.style.cursor = 'pointer';
        item.onclick = () => {
            if (note) openNoteModal(note);
        };
        item.innerHTML = `
            <div>
                <strong>🔔 ${reminder.title}</strong><br>
                <small>${new Date(reminder.reminderTime).toLocaleString('ru-RU')}</small><br>
                <small style="color: #8B5CF6;">${note ? note.title : 'Заметка'}</small>
            </div>
        `;
        list.appendChild(item);
    });
    
    if (upcoming.length === 0) {
        list.innerHTML = '<p style="color: #6B7280; text-align: center;">Нет предстоящих напоминаний</p>';
    }
}

async function toggleReminder(id, completed) {
    await fetch(`${API_URL}/reminders/${id}?completed=${completed}`, {
        method: 'PATCH'
    });
    
    await loadReminders();
    const noteReminders = reminders.filter(r => r.noteId === currentNoteId);
    renderNoteReminders(noteReminders);
    renderUpcomingReminders();
}

document.addEventListener('DOMContentLoaded', init);
