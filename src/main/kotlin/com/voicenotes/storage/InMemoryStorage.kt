package com.voicenotes.storage

import com.voicenotes.models.*
import java.util.concurrent.ConcurrentHashMap

object InMemoryStorage {
    val notes = ConcurrentHashMap<String, VoiceNote>()
    val categories = ConcurrentHashMap<String, Category>()
    val reminders = ConcurrentHashMap<String, Reminder>()
    
    init {
        val defaultCategories = listOf(
            Category(name = "Бизнес идеи", color = "#8B5CF6"),
            Category(name = "Задачи", color = "#3B82F6"),
            Category(name = "Мысли", color = "#06B6D4"),
            Category(name = "Важное", color = "#EC4899")
        )
        defaultCategories.forEach { categories[it.id] = it }
    }
    
    fun addNote(note: VoiceNote): VoiceNote {
        notes[note.id] = note
        return note
    }
    
    fun getNote(id: String): VoiceNote? = notes[id]
    
    fun getAllNotes(): List<VoiceNote> = notes.values.toList()
    
    fun updateNote(id: String, update: (VoiceNote) -> VoiceNote): VoiceNote? {
        val note = notes[id] ?: return null
        val updated = update(note)
        notes[id] = updated
        return updated
    }
    
    fun deleteNote(id: String): Boolean = notes.remove(id) != null
    
    fun addCategory(category: Category): Category {
        categories[category.id] = category
        return category
    }
    
    fun getAllCategories(): List<Category> = categories.values.toList()
    
    fun addReminder(reminder: Reminder): Reminder {
        reminders[reminder.id] = reminder
        return reminder
    }
    
    fun getRemindersForNote(noteId: String): List<Reminder> =
        reminders.values.filter { it.noteId == noteId }
    
    fun getAllReminders(): List<Reminder> = reminders.values.toList()
    
    fun updateReminder(id: String, completed: Boolean): Reminder? {
        val reminder = reminders[id] ?: return null
        val updated = reminder.copy(completed = completed)
        reminders[id] = updated
        return updated
    }
}
