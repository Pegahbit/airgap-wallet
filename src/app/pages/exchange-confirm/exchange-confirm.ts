import { Component } from '@angular/core'
import { Platform } from '@ionic/angular'
import { Router, ActivatedRoute } from '@angular/router'
import { AirGapMarketWallet, EncodedType, SyncProtocolUtils } from 'airgap-coin-lib'
import { CreateTransactionResponse } from '../../services/exchange/exchange'
import { InteractionSelectionPage } from '../interaction-selection/interaction-selection'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import BigNumber from 'bignumber.js'
import { OperationsProvider } from '../../services/operations/operations'
import { DataService, DataServiceKey } from '../../services/data/data.service'
declare let cordova

@Component({
  selector: 'page-exchange-confirm',
  templateUrl: 'exchange-confirm.html',
  styleUrls: ['./exchange-confirm.scss']
})
export class ExchangeConfirmPage {
  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet
  public fee: BigNumber

  public fromFiatAmount: number
  public feeFiatAmount: number
  public toFiatAmount: number

  public exchangeResult: CreateTransactionResponse

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public platform: Platform,
    private operationsProvider: OperationsProvider,
    private dataService: DataService
  ) {
    if (this.route.snapshot.data['special']) {
      const info = this.route.snapshot.data['special']
      this.fromWallet = info.fromWallet
      this.toWallet = info.toWallet
      this.exchangeResult = info.exchangeResult
    }

    const fromAmount = new BigNumber(this.exchangeResult.amountExpectedFrom)
    const changellyFee = new BigNumber(this.exchangeResult.changellyFee)
    const apiExtraFee = new BigNumber(this.exchangeResult.apiExtraFee)
    const totalFeeInPercent = changellyFee.plus(apiExtraFee)
    const txFee = this.fromWallet.coinProtocol.feeDefaults.medium
    const exchangeTotalFee = fromAmount.multipliedBy(totalFeeInPercent.dividedBy(100))
    this.fee = exchangeTotalFee.plus(txFee)

    this.fromFiatAmount = new BigNumber(this.exchangeResult.amountExpectedFrom).multipliedBy(this.fromWallet.currentMarketPrice).toNumber()
    this.feeFiatAmount = this.fee.multipliedBy(this.fromWallet.currentMarketPrice).toNumber()
    this.toFiatAmount = new BigNumber(this.exchangeResult.amountExpectedTo).multipliedBy(this.toWallet.currentMarketPrice).toNumber()
  }

  public async prepareTransaction() {
    const wallet = this.fromWallet
    const amount = new BigNumber(new BigNumber(this.exchangeResult.amountExpectedFrom)).shiftedBy(wallet.coinProtocol.decimals)
    const fee = new BigNumber(this.fee).shiftedBy(wallet.coinProtocol.feeDecimals)

    try {
      const { airGapTx, serializedTx } = await this.operationsProvider.prepareTransaction(
        wallet,
        this.exchangeResult.payinAddress,
        amount,
        fee
      )

      const info = {
        wallet: wallet,
        airGapTx: airGapTx,
        data: 'airgap-vault://?d=' + serializedTx
      }

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      //
    }
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  public changellyUrl() {
    this.openUrl('https://old.changelly.com/aml-kyc')
  }
}
