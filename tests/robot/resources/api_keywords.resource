*** Settings ***
Library    RequestsLibrary
Library    Collections
Library    String

*** Variables ***
${API_ROOT_URL}        http://localhost:4000
${API_BASE_URL}        http://localhost:4000/api
${DEFAULT_PASSWORD}    Password123
${WEBHOOK_HASH}        change-me

*** Keywords ***
Create API Session
    Create Session    api    ${API_BASE_URL}
    Create Session    root    ${API_ROOT_URL}

Create API Session As
    [Arguments]    ${alias}
    Create Session    ${alias}    ${API_BASE_URL}

Generate Unique Seller Payload
    ${suffix}=    Generate Random String    8    [LOWER]
    ${payload}=    Create Dictionary
    ...    fullName=Robot Seller ${suffix}
    ...    email=robot-${suffix}@example.com
    ...    password=${DEFAULT_PASSWORD}
    RETURN    ${payload}

Register Seller
    [Arguments]    ${payload}    ${alias}=api
    ${response}=    POST On Session    ${alias}    /auth/register    json=${payload}    expected_status=201
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Login Seller
    [Arguments]    ${email}    ${password}    ${alias}=api
    ${payload}=    Create Dictionary    email=${email}    password=${password}
    ${response}=    POST On Session    ${alias}    /auth/login    json=${payload}    expected_status=200
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Create CSRF Headers
    [Arguments]    ${csrf_token}
    ${headers}=    Create Dictionary    X-CSRF-Token=${csrf_token}
    RETURN    ${headers}

Get Current Seller
    [Arguments]    ${expected_status}=200    ${alias}=api
    ${response}=    GET On Session    ${alias}    /auth/me    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Logout Seller
    [Arguments]    ${csrf_token}    ${alias}=api
    ${headers}=    Create CSRF Headers    ${csrf_token}
    ${response}=    POST On Session    ${alias}    /auth/logout    headers=${headers}    expected_status=200
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Create Product
    [Arguments]    ${csrf_token}    ${name}    ${price}    ${description}    ${expected_status}=201    ${alias}=api
    ${headers}=    Create CSRF Headers    ${csrf_token}
    ${payload}=    Create Dictionary    name=${name}    price=${price}    description=${description}
    ${response}=    POST On Session    ${alias}    /payment-links    headers=${headers}    json=${payload}    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

List Seller Products
    [Arguments]    ${expected_status}=200    ${alias}=api
    ${response}=    GET On Session    ${alias}    /payment-links    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Get Seller Product Detail
    [Arguments]    ${product_id}    ${expected_status}=200    ${alias}=api
    ${response}=    GET On Session    ${alias}    /payment-links/mine/${product_id}    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Update Product
    [Arguments]    ${csrf_token}    ${product_id}    ${payload}    ${expected_status}=200    ${alias}=api
    ${headers}=    Create CSRF Headers    ${csrf_token}
    ${response}=    PATCH On Session    ${alias}    /payment-links/mine/${product_id}    headers=${headers}    json=${payload}    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Update Product Status
    [Arguments]    ${csrf_token}    ${product_id}    ${is_active}    ${expected_status}=200    ${alias}=api
    ${headers}=    Create CSRF Headers    ${csrf_token}
    ${payload}=    Create Dictionary    isActive=${is_active}
    ${response}=    PATCH On Session    ${alias}    /payment-links/mine/${product_id}/status    headers=${headers}    json=${payload}    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Delete Product
    [Arguments]    ${csrf_token}    ${product_id}    ${expected_status}=200    ${alias}=api
    ${headers}=    Create CSRF Headers    ${csrf_token}
    ${response}=    DELETE On Session    ${alias}    /payment-links/mine/${product_id}    headers=${headers}    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Get Public Product
    [Arguments]    ${slug}    ${expected_status}=200    ${alias}=api
    ${response}=    GET On Session    ${alias}    /payment-links/${slug}    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Initiate Product Payment
    [Arguments]    ${slug}    ${customer_name}=Robot Buyer    ${customer_email}=buyer@example.com    ${customer_phone}=+2250700000000    ${expected_status}=201    ${alias}=api
    ${payload}=    Create Dictionary
    ...    customerName=${customer_name}
    ...    customerEmail=${customer_email}
    ...    customerPhone=${customer_phone}
    ${response}=    POST On Session    ${alias}    /payment-links/${slug}/pay    json=${payload}    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Extract Mock Checkout Reference
    [Arguments]    ${checkout_url}
    ${reference}=    Fetch From Right    ${checkout_url}    /checkout/mock/
    RETURN    ${reference}

Get Query Parameter From Url
    [Arguments]    ${url}    ${name}
    ${value}=    Evaluate    urllib.parse.parse_qs(urllib.parse.urlparse($url).query).get($name, [""])[0]    modules=urllib.parse
    RETURN    ${value}

Complete Mock Checkout
    [Arguments]    ${reference}    ${expected_status}=200    ${alias}=api
    ${response}=    POST On Session    ${alias}    /payments/mock/${reference}/complete    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}

Download Payment Receipt
    [Arguments]    ${reference}    ${token}    ${expected_status}=200    ${alias}=root
    ${params}=    Create Dictionary    token=${token}
    ${response}=    GET On Session    ${alias}    /api/payments/${reference}/receipt    params=${params}    expected_status=${expected_status}
    RETURN    ${response}

Post Flutterwave Webhook
    [Arguments]    ${tx_ref}    ${transaction_id}    ${expected_status}=200    ${webhook_hash}=${WEBHOOK_HASH}
    ${headers}=    Create Dictionary    verif-hash=${webhook_hash}
    ${payload}=    Create Dictionary
    ...    event=charge.completed
    ...    data=${None}
    ${data}=    Create Dictionary    id=${transaction_id}    tx_ref=${tx_ref}    status=successful
    Set To Dictionary    ${payload}    data=${data}
    ${response}=    POST On Session    api    /payments/flutterwave/webhook    headers=${headers}    json=${payload}    expected_status=${expected_status}
    ${response_data}=    Call Method    ${response}    json
    RETURN    ${response_data}

Post Flutterwave Webhook With Hmac
    [Arguments]    ${tx_ref}    ${transaction_id}    ${expected_status}=200    ${webhook_hash}=${WEBHOOK_HASH}
    ${payload_json}=    Evaluate    json.dumps({"event": "charge.completed", "data": {"id": $transaction_id, "tx_ref": $tx_ref, "status": "successful"}}, separators=(",", ":"))    modules=json
    ${signature}=    Evaluate    base64.b64encode(hmac.new($webhook_hash.encode("utf-8"), $payload_json.encode("utf-8"), hashlib.sha256).digest()).decode("utf-8")    modules=base64,hmac,hashlib
    ${headers}=    Create Dictionary    Content-Type=application/json    flutterwave-signature=${signature}
    ${response}=    POST On Session    api    /payments/flutterwave/webhook    headers=${headers}    data=${payload_json}    expected_status=${expected_status}
    ${response_data}=    Call Method    ${response}    json
    RETURN    ${response_data}

Post Raw Payload
    [Arguments]    ${path}    ${payload}    ${content_type}=application/json    ${expected_status}=400    ${alias}=api
    ${headers}=    Create Dictionary    Content-Type=${content_type}
    ${response}=    POST On Session    ${alias}    ${path}    headers=${headers}    data=${payload}    expected_status=${expected_status}
    ${data}=    Call Method    ${response}    json
    RETURN    ${data}
