---

### Error Handling System

The application implements a robust two-layer error handling system:

#### **1. Route-Level Error Handler**
The first layer catches and standardizes errors from route handlers:

```typescript
// Example usage in routes
authRoutes.post('/login', errorHandler(login));
```

This handler:
- Catches all errors from route handlers
- Logs detailed error information
- Converts various error types to standardized HttpError instances
- Supports different error types:
  - Validation errors (Zod)
  - CSRF token errors
  - Database errors
  - Custom application errors
  - Unknown errors

#### **2. Global Error Handler**
The second layer provides consistent error responses across the application:

- **Development Environment:**
  ```json
  {
    "message": "Detailed error message",
    "errorCode": 400,
    "statusCode": 400,
    "timestamp": "2023-XX-XX...",
    "path": "/api/resource",
    "stack": "Error stack trace...",
    "details": { /* Additional error context */ }
  }
  ```

- **Production Environment:**
  ```json
  {
    "message": "User-friendly error message",
    "errorCode": 400,
    "statusCode": 400,
    "timestamp": "2023-XX-XX...",
    "path": "/api/resource"
  }
  ```

#### **Error Types**
The system handles various error types with specific error codes:
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden (including CSRF errors)
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

---

### Step-by-Step Guide for Authentication and Token Management

#### **1. Retrieve CSRF Token**
Before making any authenticated requests, obtain a CSRF token:

- **Request:**
  - **Method:** `GET`
  - **Endpoint:** `</api/csrf-token>`

- **Response:**
  - A CSRF token is returned, which must be used in subsequent requests.

#### **2. Signup or Login**
For signup or login, include the CSRF token obtained in Step 1 in the request headers:

- **Request:**
  - **Method:** `POST`
  - **Endpoint:** `</api/auth/signup>` or `</api/auth/login>`
  - **Headers:**
    - **`x-csrf-token:`** `12dSk0Zz-fq_QIEC481uzTbzxtM8QEjlYVF4`
  - **Body:**
    - Include user credentials (e.g., email, password).

- **Response:**
  - The server responds with:
    - **`accessToken`**: Used to authenticate subsequent requests.
    - **`refreshToken`** (for mobile devices): Used to obtain a new `accessToken` when it expires.
  - **Storage**:
    - Tokens are saved in cookies. For mobile devices, the `refreshToken` is also returned in the response body.

#### **3. Refresh Access Token Before Every Request**
Before making any request to a protected endpoint, you **must** first refresh the `accessToken` to ensure it is valid:

- **Request:**
  - **Method:** `POST`
  - **Endpoint:** `</api/refresh>`
  - **Headers:**
    - **`Authorization:`** `Bearer <refreshToken>`
    - **`x-csrf-token:`** `12dSk0Zz-fq_QIEC481uzTbzxtM8QEjlYVF4`

- **Response:**
  - The server provides a new `accessToken`. For mobile devices, both `accessToken` and `refreshToken` may be returned.

#### **4. Use Tokens in Protected Requests**
After obtaining a fresh `accessToken`, include it in the headers of your request to the protected endpoint:

- **Request:**
  - **Method:** Varies (e.g., `GET`, `POST`, etc.)
  - **Endpoint:** Any protected endpoint, e.g., `</api/protected>`
  - **Headers:**
    - **`Authorization:`** `Bearer <accessToken>`
    - **`x-csrf-token:`** `12dSk0Zz-fq_QIEC481uzTbzxtM8QEjlYVF4`

#### **5. Mobile-Specific Requirements**
For mobile devices, include both `accessToken` and `refreshToken` with each request:

- **Request for Mobile Devices:**
  - **Method:** Varies (e.g., `GET`, `POST`, etc.)
  - **Endpoint:** Any protected endpoint, e.g., `</api/protected>`
  - **Headers:**
    - **`Authorization:`** `Bearer <accessToken>`
    - **`x-csrf-token:`** `12dSk0Zz-fq_QIEC481uzTbzxtM8QEjlYVF4`
    - **`Refresh-Token:`** `<refreshToken>` (if required)

---

**Important Note:**  
**Every request to a protected endpoint must be preceded by a request to `/api/refresh` to ensure the `accessToken` is up-to-date and valid.** This step is crucial for maintaining secure access to the system and preventing unauthorized requests.

---

**How to run prisma** 
docker-compose exec expressjs npx prisma db push
docker-compose exec expressjs npx prisma studio --hostname 0.0.0.0

---

The error code 78 in Elasticsearch typically indicates that the system's virtual memory settings are not configured correctly for Elasticsearch to run. This is a common issue with Docker and Elasticsearch.

To fix this, we need to increase the virtual memory settings on your host machine. 
sysctl -n vm.max_map_count #check current value
sysctl -w vm.max_map_count=262144 #change value to 262144