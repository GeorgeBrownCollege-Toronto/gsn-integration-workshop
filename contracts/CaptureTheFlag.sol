/**
 * SPDX-License-Identifier:MIT
 */
pragma solidity ^0.6.2;

import "@opengsn/gsn/contracts/BaseRelayRecipient.sol";

contract CaptureTheFlag is BaseRelayRecipient {
    string public override versionRecipient = "2.0.0-alpha.1+opengsn.capturetheflag.irelayrecipient";

    event FlagCaptured(address previousHolder, address currentHolder);

    address public currentHolder = address(0);

    function setTrustedForwarder(address _trustedForwarder) public {
        trustedForwarder = _trustedForwarder;
    }

    function captureTheFlag() external {
        address previousHolder = currentHolder;

        currentHolder = _msgSender();

        emit FlagCaptured(previousHolder, currentHolder);
    }
}
