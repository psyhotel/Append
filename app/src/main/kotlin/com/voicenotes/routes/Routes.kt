package com.voicenotes.routes

import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import io.ktor.http.content.*
import com.voicenotes.models.*
import com.voicenotes.storage.InMemoryStorage
import com.voicenotes.services.OpenAIService
import java.io.File
import java.time.LocalDateTime

fun Route.configureRoutes() {
    val openAIService = OpenAIService()
    
    route("/api") {
        get("/") {
            call.respondText("VoiceNotes API работает! 🎤", ContentType.Text.Plain)
        }
        
        get("/notes") {
            call.respond(InMemoryStorage.getAllNotes())
        }
        
        post("/notes") {
            val request = call.receive<CreateNoteRequest>()
            val note = VoiceNote(
                title = request.title,
                categoryId = request.categoryId
            )
            InMemoryStorage.addNote(note)
            call.respond(HttpStatusCode.Created, note)
        }
        
        get("/notes/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val note = InMemoryStorage.getNote(id)
            if (note != null) {
                call.respond(note)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
        
        patch("/notes/{id}") {
            val id = call.parameters["id"] ?: return@patch call.respond(HttpStatusCode.BadRequest)
            val request = call.receive<UpdateNoteRequest>()
            
            val updated = InMemoryStorage.updateNote(id) { note ->
                note.copy(
                    title = request.title ?: note.title,
                    transcription = request.transcription ?: note.transcription,
                    categoryId = request.categoryId ?: note.categoryId,
                    updatedAt = LocalDateTime.now().toString()
                )
            }
            
            if (updated != null) {
                call.respond(updated)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
        
        delete("/notes/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            if (InMemoryStorage.deleteNote(id)) {
                call.respond(HttpStatusCode.NoContent)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
        
        post("/transcribe") {
            val multipart = call.receiveMultipart()
            var audioFile: File? = null
            var noteId: String? = null
            
            multipart.forEachPart { part ->
                when (part) {
                    is PartData.FileItem -> {
                        val fileBytes = part.streamProvider().readBytes()
                        audioFile = File.createTempFile("audio", ".webm")
                        audioFile?.writeBytes(fileBytes)
                    }
                    is PartData.FormItem -> {
                        if (part.name == "noteId") {
                            noteId = part.value
                        }
                    }
                    else -> {}
                }
                part.dispose()
            }
            
            if (audioFile == null || noteId == null) {
                return@post call.respond(HttpStatusCode.BadRequest, "Missing audio file or noteId")
            }
            
            val transcription = openAIService.transcribeAudio(audioFile!!)
            audioFile?.delete()
            
            val updated = InMemoryStorage.updateNote(noteId!!) { note ->
                note.copy(transcription = transcription, updatedAt = LocalDateTime.now().toString())
            }
            
            if (updated != null) {
                call.respond(TranscriptionResponse(transcription, noteId!!))
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
        
        post("/generate-report/{noteId}") {
            val noteId = call.parameters["noteId"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            val note = InMemoryStorage.getNote(noteId)
            
            if (note == null) {
                return@post call.respond(HttpStatusCode.NotFound)
            }
            
            val report = openAIService.generateBusinessReport(note.transcription)
            
            val updated = InMemoryStorage.updateNote(noteId) { it.copy(aiReport = report) }
            
            call.respond(AIReportResponse(report))
        }
        
        get("/categories") {
            call.respond(InMemoryStorage.getAllCategories())
        }
        
        post("/categories") {
            val category = call.receive<Category>()
            InMemoryStorage.addCategory(category)
            call.respond(HttpStatusCode.Created, category)
        }
        
        get("/reminders") {
            call.respond(InMemoryStorage.getAllReminders())
        }
        
        post("/reminders") {
            val reminder = call.receive<Reminder>()
            InMemoryStorage.addReminder(reminder)
            call.respond(HttpStatusCode.Created, reminder)
        }
        
        patch("/reminders/{id}") {
            val id = call.parameters["id"] ?: return@patch call.respond(HttpStatusCode.BadRequest)
            val completed = call.request.queryParameters["completed"]?.toBoolean() ?: false
            
            val updated = InMemoryStorage.updateReminder(id, completed)
            if (updated != null) {
                call.respond(updated)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
    }
    
    get("/") {
        val file = File("src/main/resources/frontend/static/index.html")
        call.respondFile(file)
    }
    
    get("/{path...}") {
        val path = call.parameters.getAll("path")?.joinToString("/") ?: ""
        val file = File("src/main/resources/frontend/static/$path")
        if (file.exists() && file.isFile) {
            call.respondFile(file)
        } else {
            call.respond(HttpStatusCode.NotFound)
        }
    }
}
