package com.voicenotes

import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.http.*
import io.ktor.server.routing.*
import com.voicenotes.routes.*

fun main() {
    // Запуск сервера на порту 5000
    embeddedServer(
        Netty,
        port = 5000,
        host = "0.0.0.0",
        module = Application::module
    ).start(wait = true)
}

fun Application.module() {
    // Подключаем ContentNegotiation с поддержкой JSON
    install(ContentNegotiation) {
        json()
    }

    // Настройка CORS
    install(CORS) {
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Patch)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Get)

        allowHeader(HttpHeaders.Authorization)
        allowHeader(HttpHeaders.ContentType)

        anyHost() // Разрешаем все хосты (для разработки)
    }

    // Роутинг приложения
    routing {
        configureRoutes()
    }
}
