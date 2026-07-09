-- Crear Base de Datos si no existe
CREATE DATABASE IF NOT EXISTS nexoprop DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nexoprop;

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
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    
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
