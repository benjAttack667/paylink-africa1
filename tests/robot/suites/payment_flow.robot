*** Settings ***
Documentation    Integration tests for the hardened PayLink Africa authentication and payment flow.
Resource         ../resources/api_keywords.resource
Test Setup       Create API Session
Test Teardown    Delete All Sessions

*** Test Cases ***
Health Endpoint Should Be Available
    ${response}=    GET On Session    api    /health    expected_status=200
    ${data}=    Call Method    ${response}    json
    Dictionary Should Contain Item    ${data}    status    ok
    Dictionary Should Contain Key     ${data}    timestamp
    Dictionary Should Contain Key     ${data}    requestId
    Dictionary Should Contain Key     ${response.headers}    X-Request-Id

Readiness Endpoint Should Report Database Connectivity
    ${response}=    GET On Session    api    /health/ready    expected_status=200
    ${data}=    Call Method    ${response}    json
    Dictionary Should Contain Item    ${data}    status    ready
    Dictionary Should Contain Key     ${data}    checks
    ${checks}=    Get From Dictionary    ${data}    checks
    ${database}=    Get From Dictionary    ${checks}    database
    Dictionary Should Contain Item    ${database}    status    ok
    Dictionary Should Contain Key     ${response.headers}    X-Request-Id

Authentication Should Register Access Profile Logout And Login Again
    ${seller}=    Generate Unique Seller Payload
    ${registered}=    Register Seller    ${seller}
    Dictionary Should Contain Key    ${registered}    csrfToken
    Dictionary Should Contain Key    ${registered}    user
    Dictionary Should Not Contain Key    ${registered}    token

    ${profile}=    Get Current Seller
    ${profile_user}=    Get From Dictionary    ${profile}    user
    Should Be Equal    ${profile_user}[email]    ${seller}[email]

    ${logout}=    Logout Seller    ${registered}[csrfToken]
    Dictionary Should Contain Item    ${logout}    message    Logged out successfully

    ${logged_out_profile}=    Get Current Seller    401
    Dictionary Should Contain Item    ${logged_out_profile}    message    Authentication required

    ${logged_in}=    Login Seller    ${seller}[email]    ${seller}[password]
    Dictionary Should Contain Key    ${logged_in}    csrfToken
    Dictionary Should Not Contain Key    ${logged_in}    token
    ${profile_after_login}=    Get Current Seller
    ${profile_user_after_login}=    Get From Dictionary    ${profile_after_login}    user
    Should Be Equal    ${profile_user_after_login}[email]    ${seller}[email]

Protected Seller Routes Should Require Authentication
    ${list_response}=    GET On Session    api    /payment-links    expected_status=401
    ${list_data}=    Call Method    ${list_response}    json
    Dictionary Should Contain Item    ${list_data}    message    Authentication required

    ${payload}=    Create Dictionary
    ...    name=Should Fail
    ...    price=12.00
    ...    description=No session
    ${create_response}=    POST On Session    api    /payment-links    json=${payload}    expected_status=401
    ${create_data}=    Call Method    ${create_response}    json
    Dictionary Should Contain Item    ${create_data}    message    Authentication required

Protected Seller Routes Should Require A Valid Csrf Token
    ${seller}=    Generate Unique Seller Payload
    ${registered}=    Register Seller    ${seller}
    ${payload}=    Create Dictionary
    ...    name=Robot Protected Product
    ...    price=25.00
    ...    description=Protected by CSRF

    ${missing_csrf_response}=    POST On Session    api    /payment-links    json=${payload}    expected_status=403
    ${missing_csrf_data}=    Call Method    ${missing_csrf_response}    json
    Dictionary Should Contain Item    ${missing_csrf_data}    message    Invalid or missing CSRF token

    ${invalid_headers}=    Create Dictionary    X-CSRF-Token=invalid-token
    ${invalid_csrf_response}=    POST On Session    api    /payment-links    headers=${invalid_headers}    json=${payload}    expected_status=403
    ${invalid_csrf_data}=    Call Method    ${invalid_csrf_response}    json
    Dictionary Should Contain Item    ${invalid_csrf_data}    message    Invalid or missing CSRF token

    ${created}=    Create Product    ${registered}[csrfToken]    Robot Protected Product    25.00    Protected by CSRF
    Dictionary Should Contain Key    ${created}    item

Validation Should Reject Invalid Payloads And Unexpected Fields
    ${invalid_register_payload}=    Create Dictionary
    ...    fullName=Robot
    ...    email=invalid-email
    ...    password=Password123
    ...    role=ADMIN
    ${invalid_register_response}=    POST On Session    api    /auth/register    json=${invalid_register_payload}    expected_status=400
    ${invalid_register_data}=    Call Method    ${invalid_register_response}    json
    Dictionary Should Contain Item    ${invalid_register_data}    message    Validation failed
    Dictionary Should Contain Item    ${invalid_register_data}    code    VALIDATION_ERROR
    ${register_errors}=    Evaluate    ' | '.join(f\"{item['field']}:{item['message']}\" for item in $invalid_register_data['errors'])
    Should Contain    ${register_errors}    role:role is not allowed
    Should Contain    ${register_errors}    email:Please provide a valid email address

    ${invalid_json_data}=    Post Raw Payload    /auth/login    {"email":
    Dictionary Should Contain Item    ${invalid_json_data}    message    Invalid JSON payload
    Dictionary Should Contain Item    ${invalid_json_data}    code    INVALID_JSON

    ${seller}=    Generate Unique Seller Payload
    ${registered}=    Register Seller    ${seller}
    ${created}=    Create Product    ${registered}[csrfToken]    Validation Product    18.50    Validation description
    ${item}=    Get From Dictionary    ${created}    item
    ${product_id}=    Get From Dictionary    ${item}    id

    ${invalid_product_payload}=    Create Dictionary
    ...    name=Bad Product
    ...    price=20.00
    ...    description=Invalid extra field
    ...    sellerId=forbidden
    ${invalid_product_headers}=    Create CSRF Headers    ${registered}[csrfToken]
    ${invalid_product_response}=    POST On Session    api    /payment-links    headers=${invalid_product_headers}    json=${invalid_product_payload}    expected_status=400
    ${invalid_product_data}=    Call Method    ${invalid_product_response}    json
    Dictionary Should Contain Item    ${invalid_product_data}    code    VALIDATION_ERROR
    ${product_errors}=    Evaluate    ' | '.join(f\"{item['field']}:{item['message']}\" for item in $invalid_product_data['errors'])
    Should Contain    ${product_errors}    sellerId:sellerId is not allowed

    ${empty_update_payload}=    Create Dictionary
    ${empty_update}=    Update Product    ${registered}[csrfToken]    ${product_id}    ${empty_update_payload}    400
    Dictionary Should Contain Item    ${empty_update}    message    Validation failed
    Dictionary Should Contain Item    ${empty_update}    code    VALIDATION_ERROR
    ${empty_update_errors}=    Evaluate    ' | '.join(f\"{item['field']}:{item['message']}\" for item in $empty_update['errors'])
    Should Contain    ${empty_update_errors}    body:At least one field must be provided

    ${bad_status_headers}=    Create CSRF Headers    ${registered}[csrfToken]
    ${bad_status_payload}=    Create Dictionary    isActive=false
    ${bad_status_response}=    PATCH On Session    api    /payment-links/mine/${product_id}/status    headers=${bad_status_headers}    json=${bad_status_payload}    expected_status=400
    ${bad_status_data}=    Call Method    ${bad_status_response}    json
    Dictionary Should Contain Item    ${bad_status_data}    code    VALIDATION_ERROR
    ${bad_status_errors}=    Evaluate    ' | '.join(f\"{item['field']}:{item['message']}\" for item in $bad_status_data['errors'])
    Should Contain    ${bad_status_errors}    isActive:isActive must be a boolean

    ${invalid_payment_payload}=    Create Dictionary    customerName=AB    customerEmail=bad-email    extra=not-allowed
    ${invalid_payment_response}=    POST On Session    api    /payment-links/${item}[slug]/pay    json=${invalid_payment_payload}    expected_status=400
    ${invalid_payment_data}=    Call Method    ${invalid_payment_response}    json
    Dictionary Should Contain Item    ${invalid_payment_data}    code    VALIDATION_ERROR
    ${invalid_payment_errors}=    Evaluate    ' | '.join(f\"{item['field']}:{item['message']}\" for item in $invalid_payment_data['errors'])
    Should Contain    ${invalid_payment_errors}    extra:extra is not allowed
    Should Contain    ${invalid_payment_errors}    customerEmail:Please provide a valid email address

Seller Should Only Manage Their Own Payment Links
    Create API Session As    seller_a
    Create API Session As    seller_b
    ${seller_a_payload}=    Generate Unique Seller Payload
    ${seller_b_payload}=    Generate Unique Seller Payload
    ${seller_a}=    Register Seller    ${seller_a_payload}    seller_a
    ${seller_b}=    Register Seller    ${seller_b_payload}    seller_b

    ${created}=    Create Product    ${seller_a}[csrfToken]    Protected Link    39.90    Owned by seller A    201    seller_a
    ${item}=    Get From Dictionary    ${created}    item
    ${product_id}=    Get From Dictionary    ${item}    id
    ${slug}=    Get From Dictionary    ${item}    slug

    ${detail}=    Get Seller Product Detail    ${product_id}    200    seller_a
    ${detail_item}=    Get From Dictionary    ${detail}    item
    Should Be Equal    ${detail_item}[id]    ${product_id}
    Should Be Equal    ${detail_item}[slug]    ${slug}

    ${seller_b_detail}=    Get Seller Product Detail    ${product_id}    404    seller_b
    Dictionary Should Contain Item    ${seller_b_detail}    message    Payment link not found

    ${update_payload}=    Create Dictionary    name=Updated By Seller A    price=44.50    description=Updated safely
    ${seller_b_update}=    Update Product    ${seller_b}[csrfToken]    ${product_id}    ${update_payload}    404    seller_b
    Dictionary Should Contain Item    ${seller_b_update}    message    Payment link not found

    ${seller_b_status}=    Update Product Status    ${seller_b}[csrfToken]    ${product_id}    ${False}    404    seller_b
    Dictionary Should Contain Item    ${seller_b_status}    message    Payment link not found

    ${seller_b_delete}=    Delete Product    ${seller_b}[csrfToken]    ${product_id}    404    seller_b
    Dictionary Should Contain Item    ${seller_b_delete}    message    Payment link not found

    ${updated}=    Update Product    ${seller_a}[csrfToken]    ${product_id}    ${update_payload}    200    seller_a
    ${updated_item}=    Get From Dictionary    ${updated}    item
    Should Be Equal    ${updated_item}[name]    Updated By Seller A
    Should Be Equal    ${updated_item}[price]    44.50
    Should Be Equal    ${updated_item}[slug]    ${slug}

    ${deactivated}=    Update Product Status    ${seller_a}[csrfToken]    ${product_id}    ${False}    200    seller_a
    ${deactivated_item}=    Get From Dictionary    ${deactivated}    item
    Should Be Equal    ${deactivated_item}[status]    INACTIVE

    ${public_after_deactivate}=    Get Public Product    ${slug}    404
    Dictionary Should Contain Item    ${public_after_deactivate}    message    Product not found
    ${payment_after_deactivate}=    Initiate Product Payment    ${slug}    Robot Buyer    buyer@example.com    +2250700000000    404
    Dictionary Should Contain Item    ${payment_after_deactivate}    message    Product not found

    ${reactivated}=    Update Product Status    ${seller_a}[csrfToken]    ${product_id}    ${True}    200    seller_a
    ${reactivated_item}=    Get From Dictionary    ${reactivated}    item
    Should Be Equal    ${reactivated_item}[status]    ACTIVE
    ${public_after_reactivate}=    Get Public Product    ${slug}
    ${public_item}=    Get From Dictionary    ${public_after_reactivate}    item
    Should Be Equal    ${public_item}[slug]    ${slug}

    ${deleted}=    Delete Product    ${seller_a}[csrfToken]    ${product_id}    200    seller_a
    Dictionary Should Contain Item    ${deleted}    id    ${product_id}

    ${detail_after_delete}=    Get Seller Product Detail    ${product_id}    404    seller_a
    Dictionary Should Contain Item    ${detail_after_delete}    message    Payment link not found
    ${public_after_delete}=    Get Public Product    ${slug}    404
    Dictionary Should Contain Item    ${public_after_delete}    message    Product not found

Seller Should Create Product And Public User Should Complete Checkout Successfully
    ${seller}=    Generate Unique Seller Payload
    ${registered}=    Register Seller    ${seller}

    ${created}=    Create Product    ${registered}[csrfToken]    Robot Product    49.90    Product created by Robot Framework
    ${item}=    Get From Dictionary    ${created}    item
    ${slug}=    Get From Dictionary    ${item}    slug
    Should Start With    ${slug}    robot-product

    ${listed_before_payment}=    List Seller Products
    ${summary_before}=    Get From Dictionary    ${listed_before_payment}    summary
    Should Be Equal As Integers    ${summary_before}[productsCount]    1
    Should Be Equal As Integers    ${summary_before}[paymentsCount]    0

    ${public_product}=    Get Public Product    ${slug}
    ${public_item}=    Get From Dictionary    ${public_product}    item
    Should Be Equal    ${public_item}[name]    Robot Product
    Should Be Equal    ${public_item}[price]    49.90

    ${checkout}=    Initiate Product Payment    ${slug}
    ${payment_data}=    Get From Dictionary    ${checkout}    payment
    ${checkout_url}=    Get From Dictionary    ${checkout}    checkoutUrl
    Should Be Equal    ${payment_data}[status]    PENDING
    Should Be Equal    ${payment_data}[amount]    49.90
    Should Not Be Empty    ${checkout_url}
    Should Contain    ${checkout_url}    /checkout/mock/

    ${checkout_reference}=    Extract Mock Checkout Reference    ${checkout_url}
    Should Be Equal    ${checkout_reference}    ${payment_data}[reference]
    ${completed_checkout}=    Complete Mock Checkout    ${checkout_reference}
    Dictionary Should Contain Item    ${completed_checkout}    message    Mock checkout completed successfully
    Dictionary Should Contain Key    ${completed_checkout}    redirectUrl
    Dictionary Should Contain Key    ${completed_checkout}    receiptDownloadUrl
    Should Contain    ${completed_checkout}[receiptDownloadUrl]    /api/payments/${checkout_reference}/receipt
    ${receipt_token}=    Get Query Parameter From Url    ${completed_checkout}[redirectUrl]    payment_receipt_token
    Should Not Be Empty    ${receipt_token}

    ${receipt_response}=    Download Payment Receipt    ${checkout_reference}    ${receipt_token}
    ${receipt_content_type}=    Call Method    ${receipt_response.headers}    get    Content-Type
    ${receipt_disposition}=    Call Method    ${receipt_response.headers}    get    Content-Disposition
    Should Start With    ${receipt_content_type}    application/pdf
    Should Contain    ${receipt_disposition}    receipt-${checkout_reference}.pdf
    ${receipt_size}=    Get Length    ${receipt_response.content}
    Should Be True    ${receipt_size} > 500
    ${tampered_reference}=    Set Variable    ${checkout_reference}-tampered
    ${receipt_query}=    Create Dictionary    token=${receipt_token}
    ${invalid_receipt_response}=    GET On Session    root    /api/payments/${tampered_reference}/receipt    params=${receipt_query}    expected_status=403
    ${invalid_receipt_data}=    Call Method    ${invalid_receipt_response}    json
    Dictionary Should Contain Item    ${invalid_receipt_data}    message    Receipt access denied
    Dictionary Should Contain Item    ${invalid_receipt_data}    code    INVALID_RECEIPT_TOKEN

    ${listed_after_payment}=    List Seller Products
    ${summary_after}=    Get From Dictionary    ${listed_after_payment}    summary
    Should Be Equal As Integers    ${summary_after}[productsCount]    1
    Should Be Equal As Integers    ${summary_after}[paymentsCount]    1
    Should Be Equal    ${summary_after}[totalCollected]    49.90

Webhook Should Confirm Pending Payment Idempotently
    ${seller}=    Generate Unique Seller Payload
    ${registered}=    Register Seller    ${seller}
    ${created}=    Create Product    ${registered}[csrfToken]    Webhook Product    29.00    Product paid by webhook
    ${item}=    Get From Dictionary    ${created}    item
    ${slug}=    Get From Dictionary    ${item}    slug

    ${checkout}=    Initiate Product Payment    ${slug}    Webhook Buyer    webhook@example.com    +2250700000001
    ${payment}=    Get From Dictionary    ${checkout}    payment
    Should Be Equal    ${payment}[status]    PENDING

    ${webhook_result}=    Post Flutterwave Webhook    ${payment}[reference]    mock-${payment}[id]
    Dictionary Should Contain Item    ${webhook_result}    message    Webhook processed

    ${second_webhook_result}=    Post Flutterwave Webhook    ${payment}[reference]    mock-${payment}[id]
    Dictionary Should Contain Item    ${second_webhook_result}    message    Webhook processed

    ${listed_after_webhook}=    List Seller Products
    ${summary_after_webhook}=    Get From Dictionary    ${listed_after_webhook}    summary
    Should Be Equal As Integers    ${summary_after_webhook}[paymentsCount]    1
    Should Be Equal    ${summary_after_webhook}[totalCollected]    29.00

Webhook Should Reject Invalid Signature
    ${seller}=    Generate Unique Seller Payload
    ${registered}=    Register Seller    ${seller}
    ${created}=    Create Product    ${registered}[csrfToken]    Secured Webhook Product    19.00    Reject forged webhook
    ${item}=    Get From Dictionary    ${created}    item
    ${slug}=    Get From Dictionary    ${item}    slug

    ${checkout}=    Initiate Product Payment    ${slug}    Security Buyer    security@example.com    +2250700000002
    ${payment}=    Get From Dictionary    ${checkout}    payment

    ${webhook_result}=    Post Flutterwave Webhook    ${payment}[reference]    mock-${payment}[id]    401    invalid-hash
    Dictionary Should Contain Item    ${webhook_result}    message    Invalid webhook signature

    ${listed_after_invalid_webhook}=    List Seller Products
    ${summary_after_invalid_webhook}=    Get From Dictionary    ${listed_after_invalid_webhook}    summary
    Should Be Equal As Integers    ${summary_after_invalid_webhook}[paymentsCount]    0
    Should Be Equal    ${summary_after_invalid_webhook}[totalCollected]    0.00

Webhook Should Accept Valid Hmac Signature
    ${seller}=    Generate Unique Seller Payload
    ${registered}=    Register Seller    ${seller}
    ${created}=    Create Product    ${registered}[csrfToken]    Hmac Webhook Product    21.00    Accept current HMAC signature
    ${item}=    Get From Dictionary    ${created}    item
    ${slug}=    Get From Dictionary    ${item}    slug

    ${checkout}=    Initiate Product Payment    ${slug}    Hmac Buyer    hmac@example.com    +2250700000003
    ${payment}=    Get From Dictionary    ${checkout}    payment
    ${transaction_id}=    Set Variable    mock-${payment}[id]

    ${webhook_result}=    Post Flutterwave Webhook With Hmac    ${payment}[reference]    ${transaction_id}
    Dictionary Should Contain Item    ${webhook_result}    message    Webhook processed

    ${listed_after_hmac_webhook}=    List Seller Products
    ${summary_after_hmac_webhook}=    Get From Dictionary    ${listed_after_hmac_webhook}    summary
    Should Be Equal As Integers    ${summary_after_hmac_webhook}[paymentsCount]    1
    Should Be Equal    ${summary_after_hmac_webhook}[totalCollected]    21.00

Login Rate Limit Should Block Repeated Failed Attempts
    ${suffix}=    Generate Random String    8    [LOWER]
    ${email}=    Set Variable    robot-limit-${suffix}@example.com
    ${payload}=    Create Dictionary    email=${email}    password=WrongPassword123

    FOR    ${index}    IN RANGE    8
        POST On Session    api    /auth/login    json=${payload}    expected_status=401
    END

    ${rate_limited}=    POST On Session    api    /auth/login    json=${payload}    expected_status=429
    ${rate_limited_data}=    Call Method    ${rate_limited}    json
    Dictionary Should Contain Item    ${rate_limited_data}    message    Too many authentication attempts. Please try again later.
