import { Component } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'

import { TezosKtProtocol, AirGapMarketWallet } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../services/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../services/operations/operations'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { AccountProvider } from '../../services/account/account.provider'
import { ProtocolsProvider, ProtocolSymbols } from '../../services/protocols/protocols'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { Location } from '@angular/common'

interface IAccountWrapper {
  selected: boolean
  wallet: AirGapMarketWallet
}

@Component({
  selector: 'page-sub-account-add',
  templateUrl: 'sub-account-add.html',
  styleUrls: ['./sub-account-add.scss']
})
export class SubAccountAddPage {
  public wallet: AirGapMarketWallet
  public subAccounts: IAccountWrapper[] = []

  public subProtocolType: SubProtocolType
  public subProtocolTypes = SubProtocolType

  public typeLabel: string = ''

  constructor(
    public location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private accountProvider: AccountProvider,
    private operationsProvider: OperationsProvider,
    private protocolsProvider: ProtocolsProvider,
    private dataService: DataService
  ) {
    if (this.route.snapshot.data['special']) {
      const info = this.route.snapshot.data['special']
      this.subProtocolType = info.subProtocolType
      this.wallet = info.wallet
    }

    function assertUnreachable(x: never): void {
      /* */
    }

    if (this.subProtocolType === SubProtocolType.ACCOUNT) {
      this.typeLabel = 'add-sub-account.accounts_label'
    } else if (this.subProtocolType === SubProtocolType.TOKEN) {
      this.typeLabel = 'add-sub-account.tokens_label'
    } else {
      assertUnreachable(this.subProtocolType)
    }

    // TODO: Make generic
    if (this.subProtocolType === SubProtocolType.ACCOUNT && this.wallet.protocolIdentifier === ProtocolSymbols.XTZ) {
      const protocol = new TezosKtProtocol()
      protocol
        .getAddressesFromPublicKey(this.wallet.publicKey)
        .then(res => {
          res.forEach((_value, index) => {
            const wallet = new AirGapMarketWallet(
              ProtocolSymbols.XTZ_KT,
              this.wallet.publicKey,
              this.wallet.isExtendedPublicKey,
              this.wallet.derivationPath,
              index
            )
            const exists = this.accountProvider.walletExists(wallet)
            if (!exists) {
              wallet.addresses = res
              wallet.synchronize().catch(handleErrorSentry(ErrorCategory.COINLIB))
              this.subAccounts.push({ selected: false, wallet: wallet })
            }
          })
        })
        .catch(console.error)
    } else {
      this.wallet.coinProtocol.subProtocols.forEach(subProtocol => {
        if (this.protocolsProvider.getEnabledSubProtocols().indexOf(subProtocol.identifier) >= 0) {
          const wallet = new AirGapMarketWallet(
            subProtocol.identifier,
            this.wallet.publicKey,
            this.wallet.isExtendedPublicKey,
            this.wallet.derivationPath
          )
          const exists = this.accountProvider.walletExists(wallet)
          if (!exists) {
            wallet.addresses = this.wallet.addresses
            wallet.synchronize().catch(handleErrorSentry(ErrorCategory.COINLIB))
            this.subAccounts.push({ selected: false, wallet: wallet })
          }
        }
      })
    }
  }

  toggleAccount(account: IAccountWrapper) {
    account.selected = !account.selected
  }

  addSubAccounts() {
    this.subAccounts
      .filter(account => account.selected)
      .map(account => account.wallet)
      .forEach(wallet => {
        this.accountProvider.addWallet(wallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
      })
    this.location.back()
  }

  async prepareOriginate() {
    const pageOptions = await this.operationsProvider.prepareOriginate(this.wallet)

    const info = {
      wallet: pageOptions.params.wallet,
      airGapTx: pageOptions.params.airGapTx,
      data: pageOptions.params.data
    }
    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
