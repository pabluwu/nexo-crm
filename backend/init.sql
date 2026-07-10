-- Crear Base de Datos si no existe
CREATE DATABASE IF NOT EXISTS nexoprop DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nexoprop;

-- Eliminar tablas en orden inverso de claves foráneas
DROP TABLE IF EXISTS client_pipeline_stages;
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS evaluation_history;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS client_documents;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;

-- 0. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    picture VARCHAR(255) NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Broker', -- 'Broker' | 'Administrador'
    google_id VARCHAR(100) NULL,
    google_access_token TEXT NULL,
    google_refresh_token TEXT NULL,
    google_token_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. Tabla de Clientes (Expedientes)
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(20) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address VARCHAR(255) NOT NULL,
    pipeline_state VARCHAR(30) NOT NULL DEFAULT 'reserva',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL, -- Email del usuario creador
    updated_by VARCHAR(100) NOT NULL, -- Email del último actualizador
    
    -- Campos de aprobación de crédito
    approval_type VARCHAR(20) NULL, -- 'bank' | 'mutuaria'
    approved_entity_id VARCHAR(50) NULL,
    approval_date TIMESTAMP NULL,
    
    -- Campos de baja / cancelación
    cancelation_reason TEXT NULL,
    cancelation_stage VARCHAR(100) NULL,
    canceled_at TIMESTAMP NULL,
    canceled_by VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexación para búsquedas rápidas por RUT
CREATE INDEX idx_clients_rut ON clients(rut);

-- 2. Tabla de Documentos / Adjuntos (Sustituye Firebase Storage Metadata)
CREATE TABLE IF NOT EXISTS client_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    stage VARCHAR(100) NOT NULL,            -- 'reserva', 'documentacion', etc.
    file_type VARCHAR(50) NOT NULL,        -- 'ficha_cliente', 'liquidacion', etc.
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(255) NOT NULL,        -- Ruta a la API local http://localhost:3000/uploads/...
    drive_file_id VARCHAR(255) NULL,       -- ID del archivo en Google Drive
    drive_web_view_url VARCHAR(1024) NULL, -- Enlace web directo al archivo en Google Drive
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Evaluaciones de Crédito (Bancos / Mutuarias)
CREATE TABLE IF NOT EXISTS evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    entity_type VARCHAR(10) NOT NULL,       -- 'bank' | 'mutuaria'
    entity_id VARCHAR(50) NOT NULL,         -- 'chile', 'santander', 'metlife', etc.
    entity_name VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'more_documents'
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_date TIMESTAMP NULL,
    UNIQUE KEY uq_client_entity (client_id, entity_id),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Historial de Documentación Adicional para Evaluaciones
CREATE TABLE IF NOT EXISTS evaluation_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    requested_doc_name VARCHAR(255) NOT NULL,
    submitted_doc_url VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observation TEXT NULL,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Hitos (Bitácora de comentarios)
CREATE TABLE IF NOT EXISTS milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observation TEXT NOT NULL,
    registered_by VARCHAR(100) NOT NULL,
    registered_by_id VARCHAR(100) NOT NULL,
    stage VARCHAR(100) NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla de Auditoría de Tiempos y Transiciones de Etapas
CREATE TABLE IF NOT EXISTS client_pipeline_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    stage VARCHAR(100) NOT NULL,
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exited_at TIMESTAMP NULL,
    completed_by VARCHAR(100) NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Datos semilla (Seed) de Usuarios de Prueba
INSERT INTO users (email, name, picture, role) VALUES 
('admin@nexoprop.com', 'Administrador NexoProp', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 'Administrador'),
('broker@nexoprop.com', 'Juan Broker', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop', 'Broker'),
('broker2@nexoprop.com', 'María Broker', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop', 'Broker');

-- 8. Datos semilla (Seed) de Clientes (Expedientes)
-- Asignados al broker Juan
INSERT INTO clients (id, rut, first_name, last_name, email, phone, address, pipeline_state, created_by, updated_by) VALUES
(1, '12345678-9', 'Carlos', 'Andrade', 'carlos.andrade@gmail.com', '+56 9 8765 4321', 'Av. Providencia 1234, Depto 402, Providencia', 'reserva', 'broker@nexoprop.com', 'broker@nexoprop.com'),
(2, '9876543-2', 'Patricia', 'Mendoza', 'patricia.m@outlook.com', '+56 9 7654 3210', 'Camino El Alba 8600, Las Condes', 'documentacion', 'broker@nexoprop.com', 'broker@nexoprop.com');

-- Asignados a la broker María
INSERT INTO clients (id, rut, first_name, last_name, email, phone, address, pipeline_state, created_by, updated_by) VALUES
(3, '15443221-k', 'Roberto', 'Guzmán', 'roberto.guzman@yahoo.com', '+56 9 5543 2210', 'Vicuña Mackenna 450, Santiago Centro', 'reserva', 'broker2@nexoprop.com', 'broker2@nexoprop.com');

-- Inicializar etapas para los clientes semilla
INSERT INTO client_pipeline_stages (client_id, stage, entered_at) VALUES
(1, 'reserva', NOW() - INTERVAL 5 DAY),
(2, 'reserva', NOW() - INTERVAL 10 DAY),
(2, 'documentacion', NOW() - INTERVAL 8 DAY),
(3, 'reserva', NOW() - INTERVAL 3 DAY);
