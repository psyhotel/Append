package com.voicenotes.models

import kotlinx.serialization.Serializable
import java.time.LocalDateTime
import java.util.UUID

@Serializable
data class VoiceNote(
    val id: String = UUID.randomUUID().toString(),
    val title: String = "",
    val transcription: String = "",
    val audioPath: String = "",
    val categoryId: String? = null,
    val aiReport: String? = null,
    val createdAt: String = LocalDateTime.now().toString(),
    val updatedAt: String = LocalDateTime.now().toString()
)

@Serializable
data class Category(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val color: String = "#8B5CF6"
)

@Serializable
data class Reminder(
    val id: String = UUID.randomUUID().toString(),
    val noteId: String,
    val reminderTime: String,
    val title: String,
    val description: String = "",
    val completed: Boolean = false
)

@Serializable
data class TranscriptionRequest(
    val audioData: String
)

@Serializable
data class TranscriptionResponse(
    val text: String,
    val noteId: String
)

@Serializable
data class AIReportRequest(
    val transcription: String
)

@Serializable
data class AIReportResponse(
    val report: String
)

@Serializable
data class CreateNoteRequest(
    val title: String,
    val categoryId: String? = null
)

@Serializable
data class UpdateNoteRequest(
    val title: String? = null,
    val transcription: String? = null,
    val categoryId: String? = null
)
