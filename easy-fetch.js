'use strict';

/**
 * An AJAX utility function designed for making asynchronous HTTP requests.
 * It provides configurable options for handling different types of requests,
 * UI feedback during requests, error handling, data processing, and more.
 * This function utilizes the Fetch API for making the actual HTTP requests.
 *
 * Version: 2.0.0
 * Created by: Hubrizer
 * License: GNU v3.0
 * Last Updated: 2024-02-03 10:00:00 UTC+05:30
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

// Defines the main function for making AJAX requests with configurable options
function easyAjax(options) {
    // Sets default values for various AJAX request options
    const defaults = {
        type: 'GET', // Default HTTP method
        container: document.body, // Default container element for displaying messages or loading indicators
        blockUI: true, // Blocks UI to prevent user interaction during the request
        disableButton: true, // Disables the submit button to prevent multiple submissions
        buttonSelector: "[type='submit']", // Selector for the submit button in the form
        dataType: "json", // Expected data type of the response from the server
        showToastrMsg: true, // Shows toastr messages for user feedback
        toastrOptions: { // Default options for toastr messages
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
        showSwalMsg: true, // Shows SweetAlert messages for alerts or confirmations
        swalOptions: {}, // Default options for SweetAlert
        redirect: true, // Redirects to another URL on successful request completion
        data: {}, // Data to be sent in the request
        file: false, // Indicates if the request involves file uploads
        formReset: false, // Resets the form after successful submission
        async: true, // Makes the request asynchronous
        debug: false, // Enables debug mode for logging
        timeout: 5000, // Sets a timeout for the request
        customErrorHandler: null, // Allows for a custom error handling function
        customSuccessHandler: null // Allows for a custom success handling function
    };

    // Merge default options with user-provided options to form the final settings for the AJAX request
    const settings = Object.assign({}, defaults, options);

    // Assigns a default beforeSend function if one is not provided in the settings.
    // This function is responsible for pre-request actions like disabling the submit button.
    settings.beforeSend = settings.beforeSend || defaultBeforeSend;

    // Initialize an AbortController to manage request cancellation, providing a way to abort the request if needed
    const abortController = new AbortController(); // Used to cancel the request

    // Clear existing validation errors in the form container before making a new request
    clearValidationErrors(settings.container);

    // CSRF token setup for secure AJAX requests, particularly important in frameworks like Laravel
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    /// Setup request options for the Fetch API, including method, headers, and body
    let requestOptions = {
        method: settings.type, // The HTTP method type for the request (e.g., 'GET', 'POST')
        headers: {
            'X-CSRF-TOKEN': settings.headers && settings.headers['X-CSRF-TOKEN'] ? settings.headers['X-CSRF-TOKEN'] : csrfToken,
            'X-Requested-With': 'XMLHttpRequest' // Necessary for Laravel to recognize the request as AJAX
        },
        body: null, // The request body, which will be set for methods that include data (like 'POST')
        signal: abortController.signal // Provides a way to cancel the request using the AbortController
    };

    // Prepare the request body for methods that include data, setting the appropriate headers and body content
    if (settings.type.toUpperCase() !== 'GET' && settings.type.toUpperCase() !== 'HEAD') {
        if (settings.file) {
            // If the request involves file upload, use FormData to construct the request body
            requestOptions.body = createFormData(settings);
        } else if (typeof settings.data === 'string') {
            // For URL-encoded data, set the content type header and use the string as the body
            requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            requestOptions.body = settings.data;
        } else {
            // For JSON data, set the content type header to 'application/json' and stringify the data object
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(settings.data);
        }
    }

    // If a beforeSend function is provided in the settings, call it with the settings as its argument
    // This is typically used for actions like showing a loader or disabling a submit button before the request starts
    if (settings.beforeSend && typeof settings.beforeSend === 'function') {
        settings.beforeSend(settings);
    } else {
        // If no beforeSend function is provided, call the defaultBeforeSend function
        defaultBeforeSend(settings);
    }

    // Set a timeout to abort the request if it exceeds the specified time limit, preventing the request from hanging indefinitely
    const timeoutId = setTimeout(() => abortController.abort(), settings.timeout);

    // Perform the fetch request with the prepared options
    fetch(settings.url, requestOptions)
        .then(response => {
            if (!response.ok) {
                // If the response status code indicates a failure (not in the range 200-299), throw an error
                throw { response }; // Throws an object containing the response for further error handling
            }
            return response; // Pass the successful response to the next .then() for further processing
        })
        .then(validateResponse) // Validate the response and check for any server-side errors
        .then(processContentType) // Determine the content type of the response and process accordingly (e.g., JSON, HTML)
        .then(data => processResponse(data, settings)) // Handle the processed response data based on the settings
        .catch(error => handleError(error, settings)) // Catch and handle any errors that occurred during the request or processing stages
        .finally(() => {
            clearTimeout(timeoutId); // Clear the timeout to prevent aborting the request after completion
            if (settings.disableButton) {
                // Re-enable the submit button if it was disabled before the request
                toggleButtonLoading(settings.buttonSelector, false, settings);
            }
            // Call the complete callback function if provided in the settings
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
    // Check if the error object contains a 'response' property
    if (error.response) {
        const { response } = error; // Destructure the response from the error object

        // Handle specific HTTP error statuses (e.g., 422 Unprocessable Entity)
        if (response.status === 422) {
            response.json().then(errorJson => {
                // Display validation errors

                // Use toastr to display a summary error message
                toastr.error(errorJson.message || 'Validation errors occurred.');

                // Display validation errors next to the corresponding form elements
                if (errorJson.errors) {
                    Object.entries(errorJson.errors).forEach(([field, messages]) => {
                        const inputElement = settings.container.querySelector(`[name="${field}"]`);
                        if (inputElement) {
                            displayValidationError(inputElement, messages[0]);
                        }
                    });
                }
            }).catch(jsonError => {
                console.error('Error parsing JSON response:', jsonError);
            });
        } else {
            // Handle other HTTP errors
            toastr.error('An unexpected error occurred.');
        }
    } else {
        // Handle non-HTTP errors (e.g., network issues)
        toastr.error('A network error occurred. Please check your connection and try again.');
    }
}

/**
 *  Displays a validation error message below the specified input element.
 *  @param {Element} inputElement - The input element where the error occurred.
 *  @param {string} message - The validation error message to display.
 */
function displayValidationError(inputElement, message) {
    if (!inputElement) return; // Guard clause in case the input element isn't found

    // Remove any existing error message first
    const existingError = inputElement.parentNode.querySelector('.invalid-feedback');
    if (existingError) existingError.remove();

    // Add Bootstrap 'is-invalid' class to the input element
    inputElement.classList.add('is-invalid');

    // Create the error message element
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('invalid-feedback');
    errorDiv.innerText = message; // Set the error message text

    // Insert the error message element into the DOM
    inputElement.parentNode.appendChild(errorDiv);
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
