'use strict';

/**
 * Enhanced easy-fetch script for AJAX requests using Fetch API.
 * Handles AJAX requests with various configuration options.
 * Version: 1.2.8
 * Created by: Hubrizer
 * License: GNU v3.0
 * Last Updated: 2021-09-30 10:00:00 UTC+05:30
 *
 * @param {Object} options - Configuration options for the AJAX request.
 * @param {string} options.type - HTTP method type (e.g., 'GET', 'POST').
 * @param {Element} options.container - The container element for the form.
 * @param {boolean} options.blockUI - Whether to block UI during the request.
 * @param {boolean} options.disableButton - Whether to disable the button during the request.
 * @param {string} options.buttonSelector - Selector for the submit button.
 * @param {string} options.dataType - Expected response data type.
 * @param {boolean} options.showToastrMsg - Whether to show toastr messages.
 * @param {Object} options.toastrOptions - Options for toastr messages.
 * @param {boolean} options.showSwalMsg - Whether to show Swal messages.
 * @param {Object} options.swalOptions - Options for Swal messages.
 * @param {boolean} options.redirect - Whether to redirect after a successful response.
 * @param {Object|FormData|string} options.data - Data to be sent in the request.
 * @param {boolean} options.file - Whether the request includes file upload.
 * @param {boolean} options.formReset - Whether to reset the form on success.
 * @param {boolean} options.async - Whether the request is asynchronous.
 * @param {boolean} options.debug - Whether to enable debugging mode.
 * @param {number} options.timeout - Timeout for the request in milliseconds.
 * @param {Function|null} options.customErrorHandler - Custom error handler function.
 * @param {Function|null} options.customSuccessHandler - Custom success handler function.
 */

/**
 * Default options for the easyAjax function.
 * @param options
 */
function easyAjax(options) {
    const defaults = {
        type: 'GET',
        container: document.body,
        blockUI: true,
        disableButton: true,
        buttonSelector: "[type='submit']",
        dataType: "json",
        showToastrMsg: true,
        toastrOptions: {
            "closeButton": true,
            "debug": false,
            "newestOnTop": true,
            "progressBar": false,
            "positionClass": "toastr-top-center",
            "preventDuplicates": false,
            "onclick": null,
            "showDuration": "300",
            "hideDuration": "1000",
            "timeOut": "3000",
            "extendedTimeOut": "1000",
            "showEasing": "linear",
            "hideEasing": "linear",
            "showMethod": "fadeIn",
            "hideMethod": "fadeOut"
        },
        showSwalMsg: true,
        swalOptions: {/* Default swal options */},
        redirect: true,
        data: {},
        file: false,
        formReset: false,
        async: true,
        debug: false,
        timeout: 5000,
        customErrorHandler: null,
        customSuccessHandler: null
    };

    const settings = Object.assign({}, defaults, options);
    const abortController = new AbortController();
    settings.beforeSend = settings.beforeSend || defaultBeforeSend;

    // Clear existing validation errors before starting a new AJAX request
    clearValidationErrors(settings.container);

    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    let requestOptions = {
        method: settings.type,
        headers: {
            'X-CSRF-TOKEN': settings.headers && settings.headers['X-CSRF-TOKEN'] ? settings.headers['X-CSRF-TOKEN'] : csrfToken,
            'X-Requested-With': 'XMLHttpRequest' // identify the request as an AJAX request
        },
        body: null,
        signal: abortController.signal
    };

    if (settings.type.toUpperCase() !== 'GET' && settings.type.toUpperCase() !== 'HEAD') {
        if (settings.file) {
            requestOptions.body = createFormData(settings);
        } else if (typeof settings.data === 'string') {
            requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            requestOptions.body = settings.data;
        } else {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(settings.data);
        }
    }

    if (settings.beforeSend && typeof settings.beforeSend === 'function') {
        settings.beforeSend(settings);
    } else {
        defaultBeforeSend(settings);
    }

    const timeoutId = setTimeout(() => abortController.abort(), settings.timeout);

    fetch(settings.url, requestOptions)
        .then(validateResponse)
        .then(processContentType)
        .then(data => processResponse(data, settings))
        .catch(error => handleError(error, settings))
        .finally(() => {
            clearTimeout(timeoutId);
            if (settings.disableButton) {
                toggleButtonLoading(settings.buttonSelector, false, settings);
            }
            if (settings.complete) settings.complete();
        });
}

/**
 * Toggles the loading state of a button.
 * @param {string|Element} selector - Selector or element for the button(s) to toggle.
 * @param {boolean} isLoading - Whether the button(s) should be in the loading state.
 * @param {Object} settings - Settings object from the easyAjax function.
 */
function toggleButtonLoading(selector, isLoading, settings) {
    if (!selector) {
        console.warn('toggleButtonLoading: Selector is not provided');
        return;
    }

    let buttons;

    if (selector instanceof Element) {
        buttons = [selector];
    } else if (settings && settings.container instanceof Element) {
        buttons = settings.container.querySelectorAll(selector);
    } else {
        console.warn('toggleButtonLoading: Invalid or missing container in settings, and selector is not a valid element');
        return;
    }

    buttons.forEach(button => {
        if (isLoading) {
            button.setAttribute('data-kt-indicator', 'on');
            button.disabled = true;
        } else {
            button.removeAttribute('data-kt-indicator');
            button.disabled = false;
        }
    });
}

/**
 * Default function to be called before sending the request.
 * @param {Object} settings - Settings object from the easyAjax function.
 */
function defaultBeforeSend(settings) {
    if (settings && settings.disableButton && settings.buttonSelector && settings.container) {
        toggleButtonLoading(settings.buttonSelector, true, settings);
    }
}
/**
 * Validates the response from the fetch request.
 * @param {Response} response - The Response object from the fetch request.
 * @returns {Response} A promise that resolves to the response or throws an error.
 */
function validateResponse(response) {
    if (!response.ok) {
        return response.json().then(json => {
            let error = new Error(`Network error: ${response.status}`);
            error.responseJson = json; // Attach the JSON response to the error object
            throw error;
        });
    }
    return response;
}

/**
 *  Processes the content type of the response and returns the appropriate data.
 *  @param {Response} response - The Response object from the fetch request.
 *  @returns {Promise<string>} A promise that resolves to the processed data.
 */
async function processContentType(response) {
    const contentType = response.headers.get("content-type");
    if (contentType.includes("application/json")) {
        return await response.json();
    }
    if (contentType.includes("text/html")) {
        return await response.text();
    }
    throw new Error('Unsupported content type: ' + contentType);
}

/**
 *  Processes the response data from the request.
 *  @param {any} data - The data returned from the request.
 *  @param {Object} settings - Settings object from the easyAjax function.
 */
function processResponse(data, settings) {
    if (data && !data.error) {
        handleSuccess(data, settings);
    }

    // Existing logic
    if (settings.customSuccessHandler) {
        settings.customSuccessHandler(data, settings);
    } else {
        if (settings.success) {
            settings.success(data);
        }
    }
}

/**
 *  Handles errors that occur during the fetch operation.
 *  @param {Error} error - The error object.
 *  @param {Object} settings - Settings object from the easyAjax function.
 */
function handleError(error, settings) {
    console.error('Error in fetch operation:', error);

    // Check if the error response is available and it's a 422 Unprocessable Content error
    if (error.status === 422) {
        // Parse the JSON response if not already parsed
        error.json().then(errorJson => {
            console.error('Validation errors:', errorJson);

            // Use the detailed error message from Laravel for the toastr notification
            toastr.error(errorJson.message);

            // Iterate over the validation errors and display them next to the form elements
            const errors = errorJson.errors;
            for (const [field, messages] of Object.entries(errors)) {
                const inputElement = settings.container.querySelector(`[name="${field}"]`);
                displayValidationError(inputElement, messages[0]);
            }
        });
    } else {
        // Fallback error handling for non-422 errors
        toastr.error('An error occurred. Please try again.');
    }

    // Invoke custom error handler if provided
    if (settings.customErrorHandler) {
        settings.customErrorHandler(error, settings);
    } else if (settings.error) {
        settings.error(error);
    }
}

/**
 *  Displays a validation error message below the specified input element.
 *  @param {Element} inputElement - The input element where the error occurred.
 *  @param {string} message - The validation error message to display.
 */
function displayValidationError(inputElement, message) {
    if (!inputElement) return; // Guard clause in case the input element isn't found

    // Find the form group or input container
    const formGroup = inputElement.closest('.form-group') || inputElement.parentNode;

    // Remove any existing error message first
    const existingError = formGroup.querySelector('.invalid-feedback');
    if (existingError) existingError.remove();

    // Add Bootstrap 'is-invalid' class to the input element
    inputElement.classList.add('is-invalid');

    // Create the error message element
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('invalid-feedback');
    errorDiv.innerText = message; // Set the error message text

    // Insert the error message element into the DOM, preferably inside the form group
    formGroup.appendChild(errorDiv);
}

function clearValidationErrors(container) {
    container.querySelectorAll('.invalid-feedback').forEach(element => element.remove());
    container.querySelectorAll('.is-invalid').forEach(element => element.classList.remove('is-invalid'));
}

/**
 * Handles successful responses from the fetch operation.
 * @param {any} response - The response data.
 * @param {Object} settings - Settings object from the easyAjax function.
 */
function handleSuccess(response, settings) {
    // Clear existing validation errors
    if (settings.container) {
        settings.container.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        settings.container.querySelectorAll('.is-invalid').forEach(input => input.classList.remove('is-invalid'));
    }

    if (settings.redirect && response.url) {
        window.location.href = response.url;
    }

    if (settings.formReset) {
        settings.container.querySelector('form').reset();
    }

    if (settings.showToastrMsg && response.message) {
        toastr.success(response.message);
    }
}

/**
 *  Handles failed responses from the fetch operation.
 *  @param {any} response - The response data.
 *  @param {Object} settings - Settings object from the easyAjax function.
 *  @param {string} messageType - The type of message to display (e.g., 'error').
 */
function handleFailure(response, settings, messageType) {
    if (settings.showToastrMsg && response.message) {
        toastr.error(response.message);
    }
    if (settings.showSwalMsg && window.Swal) {
        const swalOptions = Object.assign({}, settings.swalOptions, {
            text: response.message,
            icon: messageType
        });

        window.Swal.fire(swalOptions);
    }
}

/**
 *  Sanitizes HTML content to prevent XSS attacks.
 *  @param {string} html - The HTML content to sanitize.
 *  @returns {string} The sanitized HTML.
 */
function sanitizeHTML(html) {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

/**
 *  Creates FormData from the settings for file uploads.
 *  @param {Object} settings - Settings object from the easyAjax function.
 *  @returns {FormData} The FormData object for the request.
 */
function createFormData(settings) {
    const form = settings.container.querySelector('form');
    if (!form) {
        throw new Error('Form not found in the specified container.');
    }
    const formData = new FormData(form);
    Object.keys(settings.data).forEach(key => {
        formData.append(key, settings.data[key]);
    });
    return formData;
}
