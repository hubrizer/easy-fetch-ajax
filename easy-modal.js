'use strict';

function ajaxModal(selector, url, size, attr_id_value, onLoad, options) {
    const defaults = {
        formReset: false,
        debug: false,
        loaderHtml: '<div class="container-fluid d-flex justify-content-center align-items-start mt-20">\n' +
            '    <div class="card bg-white shadow shadow-sm">\n' +
            '        <div class="card-body" data-kt-indicator="on">\n' +
            '        <span class="indicator-progress fw-bolder">\n' +
            '            Please wait... <span class="spinner-border text-dark spinner-border-sm align-middle ms-2"></span>\n' +
            '        </span>\n' +
            '        </div>\n' +
            '    </div>\n' +
            '</div>', // Placeholder for your loader HTML
        keyboard: true, // Allow closing with the keyboard by default
        backdrop: true // Allow closing by clicking outside by default
    }

    let opt = Object.assign({}, defaults, options);

    if (opt.debug) {
        console.log('init [options]: ', opt);
    }

    // Dynamically create the modal structure
    const modalId = attr_id_value || `dynamic-modal-${new Date().getTime()}`;
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1" role="dialog">
            <div class="modal-dialog ${size}" role="document">
                <div class="modal-content">
                    ${opt.loaderHtml}
                </div>
            </div>
        </div>
    `;

    // Append the modal structure to the body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
        console.error('Modal element not found:', selector);
        return;
    }

    // Initialize Bootstrap modal with options from 'opt'
    let modal = new bootstrap.Modal(modalElement, {
        keyboard: opt.keyboard,
        backdrop: opt.backdrop
    });

    // Show the modal
    modal.show();

    // Fetch and load content
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            modalElement.querySelector('.modal-content').innerHTML = html;

            // Find the close button within the modal content using the data-bs-dismiss attribute
            const closeButton = modalElement.querySelector('[data-bs-dismiss="modal"]');

            // If a close button is found, attach a click event listener to it
            if (closeButton) {
                closeButton.addEventListener('click', function() {
                    // Use the 'modal' instance to hide the modal
                    modal.hide();
                });
            }

            // Automatically emit an event if a form is found
            const form = modalElement.querySelector('form');

            if (form) {
                const event = new CustomEvent('modalFormLoaded', { detail: { form: form } });
                modalElement.dispatchEvent(event);
            }

            // Find and execute scripts
            Array.from(modalElement.querySelectorAll('script')).forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });

            // Find all elements designated to trigger additional modals
            const stackedModalTriggers = modalElement.querySelectorAll('[data-bs-stacked-modal]');
            stackedModalTriggers.forEach(trigger => {
                const targetModalSelector = trigger.getAttribute('data-bs-stacked-modal');
                trigger.addEventListener('click', function() {
                    // Prevent default action if it's an anchor tag or a similar element
                    event.preventDefault();

                    // Initialize and show the targeted modal
                    const targetModalElement = document.querySelector(targetModalSelector);

                    if(opt.debug) {
                        console.log('targetModalElement:', targetModalElement)
                    }

                    if (targetModalElement) {
                        const targetModal = new bootstrap.Modal(targetModalElement, {
                            keyboard: opt.keyboard,
                            backdrop: opt.backdrop
                        });
                        targetModal.show();
                    }else{
                        console.error('Target modal element not found:', targetModalSelector);
                    }
                });
            });

            if (typeof onLoad === 'function') {
                onLoad();
            }
        })
        .catch(error => {
            console.error('Error loading modal content:', error);
            modalElement.querySelector('.modal-content').innerHTML  = `<div class="modal-header pb-0 border-0 justify-content-between">
                                                                            <div class="modal-title align d-flex align-items-center h3" id="Label">
                                                                                <i class="ki-duotone ki-information fs-2x me-2 text-info">
                                                                                 <span class="path1"></span>
                                                                                 <span class="path2"></span>
                                                                                 <span class="path3"></span>
                                                                                </i>
                                                                                Modal Content Error
                                                                            </div>
                                                                            <!--begin::Close-->
                                                                            <div class="btn btn-sm btn-icon btn-active-color-danger ms-2" data-bs-dismiss="modal" aria-label="Close">
                                                                                <i class="fa fa-times fs-2x"></i>
                                                                            </div>
                                                                            <!--end::Close-->
                                                                        </div>
                                                                        <div class="modal-body">
                                                                            <p class="text-center my-5">
                                                                                <b>Error loading content:</b>
                                                                                <br>
                                                                                ${error}
                                                                            </p>
                                                                        </div>`;
        });

    // Reset modal when it hides
    modalElement.addEventListener('hidden.bs.modal', function () {
        // Automatically emit an event if a form is found
        const form = modalElement.querySelector('form');

        modalElement.innerHTML = '';
        if (opt.formReset && form) {
            form.reset();
        }

        modalElement.remove();
    });

}

function closeModal(modal) {
    modal.hide();
}

// Example usage
// ajaxModal('#myModal', 'path/to/content', 'modal-lg', 'customModalId', () => console.log('Modal loaded!'));

// Example user with options
// Define your custom options
//const modalOptions = {
//    backdrop: 'static', // Prevent closing the modal by clicking outside
//    keyboard: false,    // Prevent closing the modal with the ESC key
//    debug: true,        // Custom option defined in your ajaxModal method
//    // Any other custom options...
//};

// Call ajaxModal with your custom options
//ajaxModal('#modalSelector', 'url-to-load-content', 'modal-lg', 'customModalId', function() {
    //console.log('Modal content loaded');
//}, modalOptions);
