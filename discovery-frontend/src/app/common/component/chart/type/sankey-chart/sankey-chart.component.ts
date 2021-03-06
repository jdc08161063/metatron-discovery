/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Created by Dolkkok on 2017. 7. 18..
 */

import { AfterViewInit, Component, ElementRef, EventEmitter, Injector, OnDestroy, OnInit, Output } from '@angular/core';
import { BaseChart, ChartSelectInfo, PivotTableInfo } from '../../base-chart';
import { BaseOption } from '../../option/base-option';
import {
  CHART_STRING_DELIMITER,
  ChartColorList,
  ChartSelectMode,
  ChartType,
  GraphLayoutType,
  SeriesType,
  ShelveFieldType,
  ShelveType,
  UIChartDataLabelDisplayType
} from '../../option/define/common';
import { OptionGenerator } from '../../option/util/option-generator';
import { Pivot } from '../../../../../domain/workbook/configurations/pivot';
import * as _ from 'lodash';
import { UIChartColorByDimension, UIChartFormat, UIChartFormatItem, UIOption } from '../../option/ui-option';
import { FormatOptionConverter } from '../../option/converter/format-option-converter';
import { LabelOptionConverter } from '../../option/converter/label-option-converter';
import { Series } from '../../option/define/series';

@Component({
  selector: 'sankey-chart',
  templateUrl: 'sankey-chart.component.html'
})
export class SankeyChartComponent extends BaseChart implements OnInit, OnDestroy, AfterViewInit {

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Private Variables
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  // 모든 노드 표시하지 않았는지 여부
  @Output()
  private notAllNode = new EventEmitter();

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Protected Variables
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Public Variables
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Constructor
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  // 생성자
  constructor(
    protected elementRef: ElementRef,
    protected injector: Injector ) {

    super(elementRef, injector);
  }

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Override Method
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  // Init
  public ngOnInit() {

    // Init
    super.ngOnInit();
  }

  // Destory
  public ngOnDestroy() {

    // Destory
    super.ngOnDestroy();
  }

  // After View Init
  public ngAfterViewInit(): void {
    super.ngAfterViewInit();
  }

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Public Method
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  /**
   * 선반정보를 기반으로 차트를 그릴수 있는지 여부를 체크
   * - 반드시 각 차트에서 Override
   */
  public isValid(pivot: Pivot): boolean {
    return (this.getFieldTypeCount(pivot, ShelveType.COLUMNS, ShelveFieldType.DIMENSION) > 1 && this.getFieldTypeCount(pivot, ShelveType.COLUMNS, ShelveFieldType.TIMESTAMP) == 0)
      && ((this.getFieldTypeCount(pivot, ShelveType.AGGREGATIONS, ShelveFieldType.MEASURE) + this.getFieldTypeCount(pivot, ShelveType.AGGREGATIONS, ShelveFieldType.CALCULATED)) == 1)
      && (this.getFieldTypeCount(pivot, ShelveType.COLUMNS, ShelveFieldType.MEASURE) == 0 && this.getFieldTypeCount(pivot, ShelveType.COLUMNS, ShelveFieldType.CALCULATED) == 0)
      && (this.getFieldTypeCount(pivot, ShelveType.AGGREGATIONS, ShelveFieldType.DIMENSION) == 0 && this.getFieldTypeCount(pivot, ShelveType.AGGREGATIONS, ShelveFieldType.TIMESTAMP) == 0)
  }

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Protected Method
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  /**
   * 차트에 설정된 옵션으로 차트를 그린다.
   * - 각 차트에서 Override
   * @param isKeepRange: 현재 스크롤 위치를 기억해야 할 경우
   */
  public draw(isKeepRange?: boolean): void {

    ////////////////////////////////////////////////////////
    // Valid 체크
    ////////////////////////////////////////////////////////

    if( !this.isValid(this.pivot) ) {

      // No Data 이벤트 발생
      this.noData.emit();
      return;
    }

    ////////////////////////////////////////////////////////
    // Basic (Type, Title, etc..)
    ////////////////////////////////////////////////////////

    // 차트의 기본옵션을 생성한다.
    this.chartOption = this.initOption();

    ////////////////////////////////////////////////////////
    // series
    ////////////////////////////////////////////////////////

    // 차트 시리즈 정보를 변환
    this.chartOption = this.convertSeries();

    ////////////////////////////////////////////////////////
    // tooltip
    ////////////////////////////////////////////////////////

    // 차트 툴팁 정보를 변환
    this.chartOption = this.convertTooltip();

    ////////////////////////////////////////////////////////
    // 추가적인 옵션사항
    ////////////////////////////////////////////////////////

    this.chartOption = this.convertEtc();

    ////////////////////////////////////////////////////////
    // 셀렉션 필터 유지
    ////////////////////////////////////////////////////////

    this.chartOption = this.convertSelectionData();

    ////////////////////////////////////////////////////////
    // apply
    ////////////////////////////////////////////////////////

    // 차트 반영
    this.apply();

    ////////////////////////////////////////////////////////
    // Draw Finish
    // - 차트 표현 완료후 resize등 후속처리
    ////////////////////////////////////////////////////////

    this.drawFinish();

    ////////////////////////////////////////////////////////
    // Selection 이벤트 등록
    ////////////////////////////////////////////////////////

    if (!this.isPage) {
      this.selection();
    }
  }

  /**
   * 차트의 기본 옵션을 생성한다.
   * - 각 차트에서 Override
   */
  protected initOption(): BaseOption {
    return {
      type: ChartType.SANKEY,
      tooltip: OptionGenerator.Tooltip.itemTooltip(),
      series: []
    };
  }

  /**
   * 결과데이터를 기반으로 차트를 구성하는 피봇정보 설정
   * - 필요시 각 차트에서 Override
   */
  protected setPivotInfo(): void {

  }

  /**
   * 시리즈 정보를 변환한다.
   * - 필요시 각 차트에서 Override
   * @returns {BaseOption}
   */
  protected convertSeries(): BaseOption {

    ////////////////////////////////////////////////////////
    // 차트 데이터를 기반으로 시리즈 생성
    ////////////////////////////////////////////////////////

    // 시리즈 설정
    this.chartOption = this.convertSeriesData();

    ////////////////////////////////////////////////////////
    // 숫자 포맷 옵션 적용
    ////////////////////////////////////////////////////////

    this.chartOption = this.convertSankeyFormatSeries(this.chartOption, this.uiOption);

    ////////////////////////////////////////////////////////
    // 데이터 레이블 옵션 적용
    ////////////////////////////////////////////////////////

    // 하위 호환을위해 Label정보 없이 저장된 데이터는 Show를 true로 변경해준다.
    if( !this.uiOption.dataLabel ) { this.uiOption.dataLabel = {showValue: true}; }
    if( _.eq(typeof this.uiOption.dataLabel.showValue, "undefined") ) { this.uiOption.dataLabel.showValue = true; }

    // 레이블 설정
    this.chartOption = LabelOptionConverter.convertLabel(this.chartOption, this.uiOption);

    ////////////////////////////////////////////////////////
    // 차트별 추가사항
    ////////////////////////////////////////////////////////

    // 차트별 추가사항 반영
    this.chartOption = this.additionalSeries();

    // 차트옵션 반환
    return this.chartOption;
  }

  /**
   * 차트별 시리즈 추가정보
   * - 반드시 각 차트에서 Override
   * @returns {BaseOption}
   */
  protected convertSeriesData(): BaseOption {

    // 노드 데이터 개수제한
    let nodes = [];
    let counter: number[] = [0,0,0];
    let isNotAll: boolean = false;
    for( let num: number = 0 ; num < this.pivot.columns.length ; num++ ) {
      let field = this.pivot.columns[num];
      for( let node of this.data.nodes ) {
        if( _.eq(field.alias, node.field) ) {
          if( counter[num] >= 50 ) {
            isNotAll = true;
            break;
          }
          counter[num]++;

          nodes.push(node);
        }
      }
    }
    this.data.nodes = nodes;
    this.notAllNode.emit(isNotAll);

    // 개수제한으로 제거된 노드가 있는 링크제거
    let links = [];
    for( let link of this.data.links ) {

      // 링크의 노드정보가 모두 존재하는지 체크
      let isSource: boolean = false;
      let isTarget: boolean = false;
      for( let node of nodes ) {
        if( link.source == node.name ) {
          isSource = true;
        }
        if( link.target == node.name ) {
          isTarget = true;
        }
      }

      // 모두 존재할때만 링크에 추가
      if( isSource && isTarget ) {
        links.push(link);
      }
    }
    this.data.links = links;

    // 색상
    const schema = (<UIChartColorByDimension>this.uiOption.color).schema;
    const colorCodes: string[] = _.cloneDeep(ChartColorList[schema]);

    // 노드를 루프돌면서 색상정보 등록
    let totalColorIndex: number = 0;
    for( let item of this.data.nodes ) {
      const colorIndex: number = totalColorIndex >= colorCodes.length ? totalColorIndex - colorCodes.length : totalColorIndex;
      totalColorIndex++;
      //item.alias = item.alias ? item.alias : item.name;
      item.itemStyle = {
        color: colorCodes[colorIndex]
      };
    }

    // 링크를 루프돌면서 라인정보 등록
    for( let item of this.data.links ) {
      item.lineStyle = {
        opacity: 0.2
      };
    }

    // 링크정보 가공
    for( let item of this.data.links ) {
      // item.sourceValue = item.source.split(CHART_STRING_DELIMITER)[1];
      // item.targetValue = item.target.split(CHART_STRING_DELIMITER)[1];
      item.sourceValue = item.originalSource;
      item.targetValue = item.originalTarget;
    }

    // 포맷정보
    const format: UIChartFormatItem = !this.uiOption.valueFormat.isAll && this.uiOption.valueFormat.each.length > 0 ? this.uiOption.valueFormat.each[0] : this.uiOption.valueFormat;

    this.chartOption.series = [{
      name: String(SeriesType.SANKEY),
      type: SeriesType.SANKEY,
      layout: GraphLayoutType.NONE,
      data: this.data.nodes,
      links: this.data.links,
      uiData: this.data.links,
      lineStyle: {
        normal: {
          color: 'source',
          curveness: 0.6
        }
      },
      right: '10%'
    }];

    // 필드정보
    let cols: string[] = [];
    let aggs: string[] = [];
    for( let node of this.data.nodes ) {
      //cols.push(node.value);
      cols.push(node.name);
    }

    this.uiOption.fieldList = [];
    for( let field of this.pivot.columns ) {
      let fieldName: string = !_.isEmpty(field.alias) ? field.alias : field.name;
      this.uiOption.fieldList.push(fieldName);
      aggs.push(fieldName);
    }
    (<UIChartColorByDimension>this.uiOption.color).targetField = _.last(this.uiOption.fieldList);

    // Pivot 정보 생성
    this.pivotInfo = new PivotTableInfo(cols, [], aggs);

    return this.chartOption;
  }

  /**
   * 셀렉션 이벤트를 등록한다.
   * - 필요시 각 차트에서 Override
   */
  protected selection(): void {
    this.addChartSelectEventListener();
  }

  /**
   * sankey uiData에 설정될 columns데이터 설정
   */
  protected setUIData(): any {

    // 노드명 가공
    for( let node of this.data.nodes ) {
      node.originalName = node.name;
      node.name = node.field + CHART_STRING_DELIMITER + node.name;
    }

    // 링크명 가공
    for( let link of this.data.links ) {
      link.originalSource = link.source;
      link.originalTarget = link.target;
      link.source = link.sourceField + CHART_STRING_DELIMITER + link.source;
      link.target = link.targetField + CHART_STRING_DELIMITER + link.target;
    }


    _.each(this.data.nodes, (node, index) => {

      node.categoryName = _.cloneDeep(node.field);
      //node.nodeName = _.cloneDeep(node.value);
      node.nodeName = _.cloneDeep(node.originalName);
      let sumValue;

      // 첫번째에 위치한 값은 source에서 값을 더하기, 그이후에는 target에서 값을 찾아 더하기
      if (0 == _.findIndex(this.pivot.columns, {alias : node.field})) {

        sumValue = _.sumBy(_.filter(this.data.links, (data) => {
          // if (-1 !== data.source.indexOf(node.value)){
          if (-1 !== data.source.indexOf(node.name)){
            return data.value;
          }
        }), 'value');
      } else {
        sumValue = _.sumBy(_.filter(this.data.links, (data) => {
          // if (-1 !== data.target.indexOf(node.value)){
          if (-1 !== data.target.indexOf(node.name)){
            return data.value;
          }
        }), 'value');
      }

      node.nodeValue = _.cloneDeep(sumValue);
    })

  }

  /**
   * 게이지차트의 tooltip 설정
   * @returns {BaseOption}
   */
  protected additionalTooltip(): BaseOption {

    ///////////////////////////
    // UI 옵션에서 값 추출
    ///////////////////////////

    let format: UIChartFormat = this.uiOption.valueFormat;

    if( _.isUndefined(this.chartOption.tooltip) ) { this.chartOption.tooltip = {}; }
    this.chartOption.tooltip.formatter = ((params): any => {

      let option = this.chartOption.series[params.seriesIndex];

      let uiData = _.cloneDeep(option.uiData);
      // uiData값이 array인 경우 해당 dataIndex에 해당하는 uiData로 설정해준다
      if (uiData && uiData instanceof Array) uiData = option.uiData[params.dataIndex];

      return this.getFormatSankeyValueSeriesTooltip(params, format, this.uiOption, option, uiData);
    });

    return this.chartOption;
  }

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   | Private Method
   |-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/

  /**
   * sankey tooltip 설정
   */
  private getFormatSankeyValueSeriesTooltip(params: any, format: UIChartFormat, uiOption?: UIOption, series?: any, uiData?: any): string {

    if (!params.data.sourceValue || !params.data.targetValue) return '';

    // UI 데이터 정보가 있을경우
    if( uiData ) {

      if (!uiOption.toolTip) uiOption.toolTip = {};
      if (!uiOption.toolTip.displayTypes) uiOption.toolTip.displayTypes = FormatOptionConverter.setDisplayTypes(uiOption.type);

      // UI 데이터 가공
      let result: string[] = [];

      let targetColumn;
      // set source tooltip
      if( -1 !== uiOption.toolTip.displayTypes.indexOf(UIChartDataLabelDisplayType.CATEGORY_NAME) ){

        targetColumn = _.find(this.pivot.columns, {'alias' : params.data.sourceField});

        result = FormatOptionConverter.getTooltipName([params.data.sourceValue], this.pivot.columns, result, true);
      }
      // set target tooltip
      if ( -1 !== uiOption.toolTip.displayTypes.indexOf(UIChartDataLabelDisplayType.NODE_NAME) ) {

        targetColumn = _.find(this.pivot.columns, {'alias' : params.data.targetField});

        result = FormatOptionConverter.getTooltipName([params.data.targetValue], [targetColumn], result, true);
      }
      if ( -1 !== uiOption.toolTip.displayTypes.indexOf(UIChartDataLabelDisplayType.NODE_VALUE) ) {

        let name = this.pivot.aggregations[0].alias;

        result.push(FormatOptionConverter.getTooltipValue(name, this.pivot.aggregations, format, params.value));

      }
      return result.join('<br/>');
    }
  }

  /**
   * Chart Click Event Listener
   *
   */
  public addChartSelectEventListener(): void {
    this.chart.off('click');

    console.info("CLICK - ON");
    this.chart.on('click', (params) => {

      console.info("CLICK!!");

      let selectMode: ChartSelectMode;
      let selectedRowValues: string[] = [];
      let selectDataList = [];
      // parameter 정보를 기반으로 시리즈정보 설정
      let seriesValueList = [];
      let seriesEdgeList = [];
      let targetDataIndex;
      let dataIndex;

      // 현재 차트의 시리즈
      const series = this.chartOption.series;
      // 데이터가 아닌 빈 공백을 클릭했다면
      // 모든 데이터 선택효과를 해제하며 필터에서 제거.
      if (this.isSelected && _.isNull(params)) {

        selectMode = ChartSelectMode.CLEAR;

        // parameter 정보를 기반으로 시리즈정보 설정
        seriesValueList = series[0].data;
        seriesEdgeList = series[0].links;

        // 선택값 스타일 초기화
        _.map(seriesEdgeList, (item) => {
          item['lineStyle']['opacity'] = 0.2;
        });

        // 선택값 제거
        _.map(seriesValueList, (item) => {
          delete item['selected'];
        });

        // 차트에서 선택한 데이터가 없음을 설정
        this.isSelected = false;

      } else if (params != null) {

        // parameter 정보를 기반으로 시리즈정보 설정
        const seriesIndex = params.seriesIndex;
        seriesValueList = series[seriesIndex].data;
        seriesEdgeList = series[seriesIndex].links;

        // 이미 선택이 되어있는지 여부
        let isSelectMode;

        // 노드를 선택했을경우
        if (params.dataType == 'node') {

          dataIndex = params.dataIndex;
        }
        // 엣지(선)을 선택했을 경우
        else {

          // find end point
          const target: string = seriesEdgeList[params.dataIndex]['target'];
          targetDataIndex = _.findIndex(seriesValueList, (item) => {
            return item.name == target;
          });

          // find start point
          const source: string = seriesEdgeList[params.dataIndex]['source'];
          dataIndex = _.findIndex(seriesValueList, (item) => {
            return item.name == source;
          });
        }

        // 이미 선택이 되어있는지 여부
        isSelectMode = _.isUndefined(seriesEdgeList[params.dataIndex].selected);

        // check node type
        let nodeFl: boolean;

        if (isSelectMode) {

          // 선택 처리
          selectMode = ChartSelectMode.ADD;
          seriesEdgeList[params.dataIndex].selected = true;
          // add select count
          seriesValueList[dataIndex].selectCnt = undefined == seriesValueList[dataIndex].selectCnt ? 1 : seriesValueList[dataIndex].selectCnt + 1;

          // set target data
          if (undefined !== targetDataIndex) {
            // add select count
            seriesValueList[targetDataIndex].selectCnt = undefined == seriesValueList[targetDataIndex].selectCnt ? 1 : seriesValueList[targetDataIndex].selectCnt + 1;
          }

          // change selected series style
          _.map(seriesEdgeList, (item) => {

            // when it's node type, check target
            nodeFl = params.dataType !== 'node' ? (undefined !== targetDataIndex && item.target == seriesValueList[targetDataIndex].name) : true;
            // when it's not node type
            if( item.source == seriesValueList[dataIndex].name && nodeFl ) {
              item['lineStyle']['opacity'] = 0.6;
            } else {
              if( item['lineStyle']['opacity'] != 0.6 ) {
                item['lineStyle']['opacity'] = 0.2;
              }
            }
          });

        } else {

          // 선택 해제
          selectMode = ChartSelectMode.SUBTRACT;

          delete seriesEdgeList[params.dataIndex].selected;

          // subtract select count of source
          seriesValueList[dataIndex].selectCnt -= 1;
          // if the last target is subtracted, the source connecting with the last target is subtracted
          if (0 == seriesValueList[dataIndex].selectCnt) delete seriesValueList[dataIndex].selected;

          // set target data
          if (undefined !== targetDataIndex) {

            seriesValueList[targetDataIndex].selectCnt -= 1;

            // if the last source is subtracted, the source connecting with the last source is subtracted
            if (0 == seriesValueList[targetDataIndex].selectCnt) {
              delete seriesValueList[targetDataIndex].selected;
            }
          }

          _.map(seriesEdgeList, (item) => {

            // when it's node type, check target
            nodeFl = params.dataType !== 'node' ? (undefined !== targetDataIndex && item.target == seriesValueList[targetDataIndex].name) : true;

            // when it's not node type
            if( item.source == seriesValueList[dataIndex].name && nodeFl) {
              item['lineStyle']['opacity'] = 0.2;
            }
          });
        }

        // 차트에서 선택한 데이터 존재 여부 설정
        this.isSelected = isSelectMode;

        // UI에 전송할 선택정보 설정
        let data: any[] = this.setSelectData(params, params.name, selectedRowValues);
        let value: any = seriesValueList[dataIndex];
        let targetValue: any = seriesValueList[targetDataIndex];
        if( data.length > 0 && value ) {
          for( let item of data ) {

            // set source value, selected count is 0 (last value)
            if( item.name == value.field ) {

              // when source is the last, subtract the target
              if (this.isSelected || (!this.isSelected && 0 == value.selectCnt)) {
                item.data = [value.originalName];
                selectDataList.push(item);
              }
            // if targetValue exists
            } else if ( targetValue && targetValue.field == item.name ) {

              // when target is the last, subtract the source
              if (this.isSelected || (!this.isSelected && 0 == targetValue.selectCnt)) {
                item.data = [targetValue.originalName];
                selectDataList.push(item);
              }
            }
          }
        }
        console.info(selectDataList);

      } else {
        return;
      }

      // 자기자신을 선택시 externalFilters는 false로 설정
      if (this.params.externalFilters) this.params.externalFilters = false;

      // 차트에 적용
      this.apply(false);
      this.lastDrawSeries = _.cloneDeep(this.chartOption['series']);

      // 이벤트 데이터 전송
      this.chartSelectInfo.emit(new ChartSelectInfo(selectMode, selectDataList, this.params));
    });
  }

  /**
   * Series: 포맷에 해당하는 옵션을 모두 적용한다.
   * @param chartOption
   * @param uiOption
   * @returns {BaseOption}
   */
  private convertSankeyFormatSeries(chartOption: BaseOption, uiOption: UIOption): BaseOption {

    ///////////////////////////
    // UI 옵션에서 값 추출
    ///////////////////////////

    let format: UIChartFormat = uiOption.valueFormat;
    if (_.isUndefined(format)){ return chartOption };

    // 축의 포멧이 있는경우 축의 포멧으로 설정
    const axisFormat = FormatOptionConverter.getlabelAxisScaleFormat(uiOption);
    if (axisFormat) format = axisFormat;

    ///////////////////////////
    // 차트 옵션에 적용
    // - 시리즈
    ///////////////////////////

    // 시리즈
    let series: Series[] = chartOption.series;

    // 적용
    _.each(series, (option, index) => {

      if( _.isUndefined(option.label) ) { option.label = { normal: {} }; }
      if( _.isUndefined(option.label.normal) ) { option.label.normal = {} }

      option.label.normal.formatter = ((item) => {

        let uiData = _.cloneDeep(option.uiData);
        return this.getFormatSankeyValueSeries(item, format, uiOption, option, uiData);
      });
    });

    // 반환
    return chartOption;
  }

  /**
   * 센키의 포멧레이블 설정
   * @param params
   * @param format
   * @param uiOption
   * @param series
   * @param uiData
   * @returns {any}
   */
  private getFormatSankeyValueSeries(params: any, format: UIChartFormat, uiOption?: UIOption, series?: any, uiData?: any): string {

    // UI 데이터 정보가 있을경우
    if( uiData ) {

      if (!uiOption.dataLabel || !uiOption.dataLabel.displayTypes) return '';

      // UI 데이터 가공
      let isUiData: boolean = false;
      let result: string[] = [];
      if( -1 !== uiOption.dataLabel.displayTypes.indexOf(UIChartDataLabelDisplayType.CATEGORY_NAME) ){

        result.push(params.data.categoryName);
        isUiData = true;
      }
      if ( -1 !== uiOption.dataLabel.displayTypes.indexOf(UIChartDataLabelDisplayType.NODE_NAME) ) {
        result.push(params.data.nodeName);
        isUiData = true;
      }
      if ( -1 !== uiOption.dataLabel.displayTypes.indexOf(UIChartDataLabelDisplayType.NODE_VALUE) ) {
        result.push(FormatOptionConverter.getFormatValue(params.data.nodeValue, format));
        isUiData = true;
      }

      let label: string = "";

      // UI 데이터기반 레이블 반환
      if( isUiData ) {
        for( let num: number = 0 ; num < result.length ; num++ ) {
          if( num > 0 ) {
            label += "\n";
          }
          if(series.label && series.label.normal && series.label.normal.rich) {
            label += '{align|'+ result[num] +'}';
          }
          else {
            label += result[num];
          }
        }
        return label;

        // 선택된 display label이 없는경우 빈값 리턴
      } else {
        return label;
      }
    }

    return FormatOptionConverter.noUIDataFormat(params, format);
  }

}
